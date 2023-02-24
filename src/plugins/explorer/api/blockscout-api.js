'use strict';
const axios = require('axios').default;

// Mostly follows etherscan api definition except for few cases
// Decided to have a code-duplication instead of writing complex 
// mapping logic
class BlockscoutApi {
  constructor({ baseURL }) {
    this.api = axios.create({baseURL})
  }

  /**
   * Returns a list of ERC20 Token Transfer Events hashes by Address
   * @param {string} from start block
   * @param {string} to end block
   * @param {string} address wallet address
   * @param {string} tokenAddress  address
   * @returns {Promise<string[]>} array of transaction hashes
   */
  async getTokenTransactions(from, to, address, tokenAddress) {
    const params = {
      module: 'account',
      action: 'tokentx',
      sort: 'desc',
      contractaddress: tokenAddress,
      start_block: from,
      end_block: to,
      address,
    }
    const { data } = await this.api.get('', { params })
    const { status, message, result } = data
    if (status !== '1' && message !== 'No transactions found') {
      throw new Error(result)
    }
    return result.map((transaction) => transaction.hash)
  }

  /**
   * Returns a list of transactions for a specific address
   * @param {string} from start block
   * @param {string} to end block
   * @param {string} address wallet address
   * @returns {Promise<string[]>} array of transaction hashes
   */
  async getEthTransactions(from, to, address) {
    const params = {
      module: 'account',
      action: 'txlist',
      sort: 'desc',
      start_block: from,
      end_block: to,
      address,
    }

    const { data } = await this.api.get('', { params })

    const { status, message, result } = data
    if (status !== '1' && message !== 'No transactions found') {
      throw new Error(result)
    }
    return result.map((transaction) => transaction.hash)
  }
}

module.exports = { BlockscoutApi };