'use strict'

const axios = require('axios').default;
const { getExchangeRate } = require('safe-exchange-rate')
const debug = require('debug')('lmr-wallet:core:rates')
const { BittrexClient } = require('bittrex-node')


const createStream = require('./stream')
const client = new BittrexClient()

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

    const getAsset = (id) =>
    axios
      .get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: 'lumerin',
          vs_currencies: 'usd'
        }
      })
      .then((response) =>
        response.data &&
        response.data.lumerin &&
        typeof response.data.lumerin.usd === 'number'
          ? Number.parseFloat( response.data.lumerin.usd)
          : null
      )

    const getRate = () =>
      // TODO: Update LMR/ETH or LMR/USD rate whenever we get put onto a dex
      // getExchangeRate(`${symbol}:USD`).then(function (rate) {
      {
        return symbol === 'LMR' ? getAsset() : getExchangeRate(`LMR:USD`).then(function (rate) {
          if (typeof rate !== 'number') {
            throw new Error(`No exchange rate retrieved for ${symbol}`)
          }
          return rate
        })
      }

    dataStream = createStream(getRate, ratesUpdateMs)

    dataStream.on('data', function (price) {
      debug('Coin price received')

      const priceData = { token: symbol, currency: 'USD', price }
      eventBus.emit('coin-price-updated', priceData)
    })

    dataStream.on('error', function (err) {
      debug('Data stream error')

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
