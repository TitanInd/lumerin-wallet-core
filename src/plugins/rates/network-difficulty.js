//@ts-check
const axios = require('axios').default
const logger = require('../../logger');

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
    logger.error('Failed to get network difficulty:', err)
  }
}

const getBlockReward = async () => {
  try {
    const baseUrl = 'https://blockchain.info'
    const res = await axios.get(`${baseUrl}/q/bcperblock`)
    return res?.data
  } catch (err) {
    logger.error('Failed to get block reward:', err)
  }
}

module.exports = { getNetworkDifficulty, getBlockReward }
