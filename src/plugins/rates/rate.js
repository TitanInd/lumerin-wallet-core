const debug = require('debug')('lmr-wallet:getRate')
const { getRateCoingecko } = require('./rate-coingecko')
const { getRateCoinpaprika } = require('./rate-coinpaprika')
const { getRateKucoin } = require('./rate-kucoin')

/**
 * Returns ETH and LMR prices in USD from exchanges api
 * @returns {Promise<{ LMR: number, ETH: number}>}
 */
const getRate = async () => {
  const servicePriority = [getRateCoingecko, getRateCoinpaprika, getRateKucoin]

  for (const service of servicePriority) {
    try {
      const rates = await service()
      return rates
    } catch (err) {
      debug(err)
    }
  }
}

module.exports = { getRate }
