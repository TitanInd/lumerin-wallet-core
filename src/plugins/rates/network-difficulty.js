//@ts-check
const axios = require('axios').default
const debug = require('debug')('lmr-wallet:getDifficulty')


/**
 * Returns BTC network difficulty
 * @returns {Promise<number>}
 */
const getNetworkDifficulty = async () => {
  try {
    const baseUrl = 'https://api-r.bitcoinchain.com'
    const res = await axios.get(`${baseUrl}/v1/status`)
    return res?.data?.difficulty
  } catch (err) {
    debug(err)
  }
}

module.exports = { getNetworkDifficulty }
