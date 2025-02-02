'use strict'

const logger = require('../../logger');

const { getNetworkDifficulty, getBlockReward } = require('./network-difficulty')
const { getRate } = require('./rate')
const createStream = require('./stream')

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin() {
  let dataStream
  let networkDifficultyStream

  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ events: string[] }} The instance details.
   */
  function start({ config, eventBus }) {
    // debug.enabled = debug.enabled || config.debug

    logger.debug('Plugin starting')

    const { ratesUpdateMs, symbol } = config

    dataStream = createStream(getRate, ratesUpdateMs)

    dataStream.on('data', function (price) {
      logger.debug('coin price updated: ', price);
      if (price) {
        Object.entries(price).forEach(([token, price]) =>
          eventBus.emit('coin-price-updated', {
            token: token,
            currency: 'USD',
            price: price,
          })
        )
      }
    })

    dataStream.on('error', function (err) {
      logger.error('coin price error', err)

      eventBus.emit('wallet-error', {
        inner: err,
        message: `Could not get exchange rate for ${symbol}`,
        meta: { plugin: 'rates' },
      })
    })

    const streamFn = async () => {
      return {
        difficulty: await getNetworkDifficulty(),
        reward: await getBlockReward(),
      }
    }

    networkDifficultyStream = createStream(streamFn, ratesUpdateMs)

    networkDifficultyStream.on('data', function (data) {
      const { difficulty, reward } = data;
      eventBus.emit('network-difficulty-updated', {
        difficulty,
        reward,
      })
    })

    networkDifficultyStream.on('error', function (err) {
      eventBus.emit('wallet-error', {
        inner: err,
        message: `Could not get network difficulty`,
        meta: { plugin: 'rates' },
      })
    })

    return {
      events: ['coin-price-updated', 'wallet-error', 'network-difficulty-updated'],
    }
  }

  /**
   * Stop the plugin instance.
   */
  function stop() {
    logger.debug('Plugin stopping')

    dataStream.destroy()
    networkDifficultyStream.destroy()
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
