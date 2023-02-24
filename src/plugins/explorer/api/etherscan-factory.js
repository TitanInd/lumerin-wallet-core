const { EtherscanApi } = require('./etherscan-api');

const createEtherscanApi = (chainId) =>{
  let baseURL

  switch (chainId.toString()) {
    case 'mainnet':
    case '1':
      baseURL = 'https://api.etherscan.io/api'
      break
    case 'goerli':
    case '5':
      baseURL = 'https://api-goerli.etherscan.io/api'
      break
    default:
      throw new Error(`Unsupported chain ${chainId}`)
  }

  return new EtherscanApi({ baseURL })
}

module.exports = { createEtherscanApi }