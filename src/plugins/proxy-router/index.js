'use strict'

const debug = require('debug')('lmr-wallet:core:proxy-router')

const createConnectionManager = require('./connections-manager')

function createPlugin() {
  let connectionManager

  function start({ config, eventBus }) {
    debug.enabled = config.debug

    debug('Initiating proxy-router connections stream')
    connectionManager = createConnectionManager(config, eventBus)

    const refreshConnectionsStream = (data) =>
      connectionManager
        .getConnectionsStream(data.url)
        .on('data', (data) => {
          eventBus.emit('proxy-router-connections-changed', {
            connections: data.connections,
          })
        })
        .on('error', (err) => {
          eventBus.emit('error', `Proxy router connection error: ${err}`)
        })

    return {
      api: {
        refreshConnectionsStream: refreshConnectionsStream,
        // getConnections: connectionManager.getConnections(),
        // getConnectionsStream: connectionManager.getConnectionsStream()
      },
      events: [
        'proxy-router-connections-changed',
        'proxy-router-status-changed',
        'proxy-router-error',
      ],
      name: 'proxy-router',
    }
  }

  function stop() {
    connectionManager.disconnect()
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
