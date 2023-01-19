'use strict'

const debug = require('debug')('lmr-wallet:core:rates')
const { getRate } = require('./getLmrRate')
const createStream = require('./stream')

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin() {
  let dataStream

  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ events: string[] }} The instance details.
   */
  function start({ config, eventBus }) {
    debug.enabled = debug.enabled || config.debug

    debug('Plugin starting')

    const { ratesUpdateMs, symbol } = config

    dataStream = createStream(getRate, ratesUpdateMs)

    dataStream.on('data', function (price) {
      Object.entries(price).forEach(([token, price]) =>
        eventBus.emit('coin-price-updated', {
          token: token,
          currency: 'USD',
          price: price,
        })
      )
    })

    dataStream.on('error', function (err) {
      debug('coin price error', err)

      eventBus.emit('wallet-error', {
        inner: err,
        message: `Could not get exchange rate for ${symbol}`,
        meta: { plugin: 'rates' },
      })
    })

    return {
      events: ['coin-price-updated', 'wallet-error'],
    }
  }

  /**
   * Stop the plugin instance.
   */
  function stop() {
    debug('Plugin stopping')

    dataStream.destroy()
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
