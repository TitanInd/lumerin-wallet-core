//@ts-check
const axios = require('axios').default
const debug = require('debug')('lmr-wallet:getDifficulty')


/**
 * Returns BTC network difficulty
 * @returns {Promise<number>}
 */
const getNetworkDifficulty = async () => {
  try {
    const baseUrl = 'https://blockchain.info'
    const res = await axios.get(`${baseUrl}/q/getdifficulty`)
    return res?.data
  } catch (err) {
    debug(err)
  }
}

module.exports = { getNetworkDifficulty }
