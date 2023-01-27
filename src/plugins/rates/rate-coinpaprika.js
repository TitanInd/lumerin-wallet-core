//@ts-check
const axios = require('axios').default

/**
 * Returns ETH and LMR prices in USD from coingecko api
 * @returns {Promise<{ LMR: number, ETH: number}>}
 */
const getRateCoinpaprika = async () => {
  const baseUrl = 'https://api.coinpaprika.com'

  const [LMR, ETH] = await Promise.all(
    ['lmr-lumerin', 'eth-ethereum'].map(async (coin) => {
      const res = await axios.get(`${baseUrl}/v1/tickers/${coin}`)
      const price = res?.data?.quotes?.USD?.price
      if (!price) {
        throw new Error(
          `invalid price response for ${coin} from coinpaprika: ${res.data}`
        )
      }
      return price
    })
  )

  return { LMR, ETH }
}

module.exports = { getRateCoinpaprika }
