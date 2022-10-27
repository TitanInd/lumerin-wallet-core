'use strict';

const url = require('url');
const { CookieJar } = require('tough-cookie');
const { create: createAxios } = require('axios');
const { default: axiosCookieJarSupport } = require('axios-cookiejar-support');
const debug = require('debug')('lmr-wallet:core:explorer:connection-manager');
const EventEmitter = require('events');
const io = require('socket.io-client');
const pRetry = require('p-retry');

/**
 * Create an object to interact with the Lumerin indexer.
 *
 * @param {object} config The configuration object.
 * @param {object} eventBus The corss-plugin event bus.
 * @returns {object} The exposed indexer API.
 */
function createConnectionsManager (config, eventBus) {
  const { debug: enableDebug, useNativeCookieJar, proxyRouterUrl } = config;
  const baseProxyRouterUrl = url.parse(proxyRouterUrl).host;

  debug.enabled = enableDebug;

  let axios;
  let jar;
  let socket;

  if (useNativeCookieJar) {
    axios = createAxios({
      baseURL: proxyRouterUrl
    });
  } else {
    jar = new CookieJar();
    axios = axiosCookieJarSupport(createAxios(({
      baseURL: proxyRouterUrl,
      withCredentials: true
    })));
    axios.defaults.jar = jar;
  }

  const getConnections = () =>
    axios("/connections")
      .then(res => res.data);

  const getSocket = () => io("ws://" + baseProxyRouterUrl + "/ws", {
      autoConnect: true,
      extraHeaders: jar
        ? { Cookie: jar.getCookiesSync("ws://" + baseProxyRouterUrl + "/ws").join(';') }
        : {}
    });

  const getCookiePromise = useNativeCookieJar
    ? Promise.resolve()
    : pRetry(
      () => {
        console.log("try get connections");
        return getConnections()
          .then(function (data) {
            console.log('Got connections stream cookie')
            return data;
          });
      },
      {
        forever: true,
        onFailedAttempt (err) {
          debug('Failed to get connections stream cookie', err)
        }
      }
    );



  /**
   * Create a stream that will emit an event each time a connection is published to the proxy-router
   *
   * The stream will emit `data` for each connection. If the proxy-router connection is lost
   * or an error occurs, an `error` event will be emitted. In addition, when the
   * connection is restablished, a `resync` will be emitted.
   *
   * @returns {object} The event emitter.
   */
  function getConnectionsStream () {
    const stream = new EventEmitter();
    // TODO: remove dummy data

    getCookiePromise
      .then(function (initialConnections) {
        debug("polling for connections...", initialConnections);

        eventBus.emit("initial-state-received", {
          proxyRouter: {
            connections: initialConnections,
            syncStatus: "syncing"
          }
        });

        let isConnected = true;

        setInterval(function () {
          console.log("attempting to get connections");
          getConnections().then(function (connections) {
console.log("got connections: ", connections);
            if (!isConnected) {
              isConnected = true
              console.log("emit proxy-router-status-changed");
              eventBus.emit('proxy-router-status-changed', {
                isConnected,
                syncStatus: "synced"
              });
            }
            
            stream.emit('data', {
              connections,
              syncStatus: "synced"
            });
          }).catch(err => {

            isConnected = false;

            eventBus.emit('proxy-router-status-changed', {
              isConnected,
              syncStatus: "syncing"
            });

            eventBus.emit("error", `error fetching connections: ${err}`);
          });
        }, 5000);
        // debug("creating socket");
        //   socket = getSocket();

        //   debug("created socket: ", socket.id)
        //   socket.on('connect', function () {
        //     debug('Connection manager connected to proxy-router');
        //     eventBus.emit('proxy-router-status-changed', {
        //       isConnected: true
        //     });
        //     socket.emit('subscribe', { type: 'cxns' },
        //       function (err) {
        //         if (err) {
        //           stream.emit('error', err)
        //         }
        //       }
        //     )
        //   });

        //   socket.on('cxns', function (data) {
        //     console.log("cxns data: ", data);
        //     if (!data) {
        //       stream.emit('error', new Error('Indexer sent no tx event data'));
        //       return;
        //     }

        //     const { type, connections } = data;

        //     if (type === 'cxns') {
        //       if (typeof connections !== 'Array') {
        //         stream.emit('error', new Error('Connections Manager sent bad cxns event data'));
        //         return;
        //       }

        //       stream.emit('data', { connections });
        //     }
        //   });

        //   socket.on('disconnect', function (reason) {
        //     debug('Connection manager disconnected');
        //     eventBus.emit('proxy-router-status-changed', {
        //       connected: false
        //     });
        //     stream.emit('error', new Error(`Indexer disconnected with ${reason}`));
        //   })

        //   socket.on('reconnect', function () {
        //     stream.emit('resync');
        //   });

        //   socket.on('error', function (err) {
        //     debug("connections manager socket error");
        //     stream.emit('error', err);
        //   });

        //   socket.on("connect_error", (err) => {
        //     debug(`connect_error due to ${err.name} - ${err.message}\r\n\r\n`);
        //   });

        //   // socket.open();

        //   debug("socket listeners: ", [...socket.listeners("connect"), ...socket.listeners("disconnect"), ...socket.listeners("cxns"), ...socket.listeners("reconnect")]);
        //   // setInterval(() => {

        //   //   debug("socket connected: ", socket.connected, "; socket disconnected: ", socket.disconnected);
        //   //   socket.open();
        //   // },
        //   //   2000
        //   // )
      })
      .catch(function (err) {
        debug("connections manager catch cookie promise error");
        stream.emit('error', err);
      });

    return stream;
  }

  /**
   * Disconnects.
   */
  function disconnect () {
    if (socket) {
      socket.close();
    }
  }

  return {
    disconnect,
    getConnections,
    getConnectionsStream
  };
}

module.exports = createConnectionsManager;
