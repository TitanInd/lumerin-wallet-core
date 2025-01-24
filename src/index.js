'use strict'

const { merge, union } = require('lodash')
const EventEmitter = require('events')
const logger = require('./logger');

const pluginCreators = [
  require('./plugins/rates'),
  require('./plugins/eth'),
  require('./plugins/explorer'),
  require('./plugins/wallet'),
  require('./plugins/token'),
  require('./plugins/lumerin'),
  require('./plugins/proxy-router'),
  require('./plugins/contracts'),
  require('./plugins/devices'),
  require('./plugins/validator-registry')
]

function createCore() {
  let eventBus
  let initialized = false
  let plugins

  function start(givenConfig) {
    if (initialized) {
      throw new Error('Wallet Core already initialized')
    }

    const config = merge({}, givenConfig)

    if (config.debug) {
      logger.transports.console.level = 'debug'
      logger.transports.file.level = 'debug'
    } else {
      logger.transports.console.level = 'warn'
      logger.transports.file.level = 'warn'
    }

    eventBus = new EventEmitter()
    eventBus.emit = function (eventName, ...args) {
      logger.debug('[Event] -', eventName)
      return EventEmitter.prototype.emit.apply(this, arguments)
    }

    logger.debug('Wallet core starting', config)

    let coreEvents = []
    const pluginsApi = {}

    plugins = pluginCreators.map((create) => create())

    plugins.forEach(function (plugin) {
      const params = { config, eventBus, plugins: pluginsApi }
      const { api, events, name } = plugin.start(params)

      if (api && name) {
        pluginsApi[name] = api
      }

      if (events) {
        coreEvents = union(coreEvents, events)
      }
    })

    logger.debug('Exposed events', coreEvents)

    initialized = true

    return {
      api: pluginsApi,
      emitter: eventBus,
      events: coreEvents,
    }
  }

  function stop() {
    if (!initialized) {
      throw new Error('Wallet Core not initialized')
    }

    plugins.reverse().forEach(function (plugin) {
      plugin.stop()
    })

    plugins = null

    eventBus.removeAllListeners()
    eventBus = null

    initialized = false

    logger.warn('Wallet core stopped')
  }

  return {
    start,
    stop,
  }
}

module.exports = createCore
