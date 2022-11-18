'use strict'

const { create: createAxios } = require('axios')
const debug = require('debug')('lmr-wallet:core:explorer:connection-manager')
const EventEmitter = require('events')
const pRetry = require('p-retry')

/**
 * Create an object to interact with the Lumerin indexer.
 *
 * @param {object} config The configuration object.
 * @param {object} eventBus The corss-plugin event bus.
 * @returns {object} The exposed indexer API.
 */
function createConnectionsManager(config, eventBus) {
  const { debug: enableDebug, proxyRouterUrl } = config
  const pollingInterval = 5000;

  debug.enabled = enableDebug

  const axios = createAxios({
    baseURL: proxyRouterUrl,
  })

  let interval

  const getConnections = () => axios('/miners').then((res) => res.data.Miners)

  const getConnectionsRetriable = pRetry(
    () => {
      console.log('try get connections')
      return getConnections().then(function (data) {
        console.log('Got connections stream cookie')
        return data
      })
    },
    {
      forever: true,
      onFailedAttempt(err) {
        debug('Failed to get connections stream:', err)
      },
    }
  )

  /**
   * Create a stream that will emit an event each time a connection is published to the proxy-router
   *
   * The stream will emit `data` for each connection. If the proxy-router connection is lost
   * or an error occurs, an `error` event will be emitted. In addition, when the
   * connection is restablished, a `resync` will be emitted.
   *
   * @returns {object} The event emitter.
   */
  function getConnectionsStream() {
    const stream = new EventEmitter()

    getConnectionsRetriable
      .then(function (initialConnections) {
        debug('polling for connections...', initialConnections)
        eventBus.emit('initial-state-received', {
          proxyRouter: {
            connections: initialConnections,
            isConnected: true
          },
        })

        let isConnected = true

        interval = setInterval(() => {
          console.log('attempting to get connections')
          getConnections()
            .then((connections) => {
              if (!isConnected) {
                isConnected = true
                console.log('emit proxy-router-status-changed')
                eventBus.emit('proxy-router-status-changed', {
                  isConnected,
                  syncStatus: 'synced',
                })
              }

              stream.emit('data', {
                connections,
              })
            })
            .catch((err) => {
              isConnected = false

              eventBus.emit('proxy-router-status-changed', {
                isConnected,
                syncStatus: 'syncing',
              })

              eventBus.emit('error', `error fetching connections: ${err}`)
            })
        }, pollingInterval)
      })
      .catch((err) => {
        debug('connections getConnectionsStream promise error')
        stream.emit('error', err)
      })

    return stream
  }

  /**
   * Disconnects.
   */
  function disconnect() {
    if (socket) {
      socket.close()
    }
    if (interval) {
      clearInterval(interval)
    }
  }

  return {
    disconnect,
    getConnections,
    getConnectionsStream,
  }
}

module.exports = createConnectionsManager
