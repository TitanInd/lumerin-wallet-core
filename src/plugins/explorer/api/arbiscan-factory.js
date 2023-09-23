const { EtherscanApi } = require('./etherscan-api')

const createArbiscanApi = (chainId) => {
  let baseURL

  switch (chainId.toString()) {
    case '421613':
      baseURL = 'https://api-goerli.arbiscan.io/api'
      break
    case '42161':
      baseURL = 'https://api.arbiscan.io/api'
    default:
      throw new Error(`Unsupported chain ${chainId}`)
  }

  return new EtherscanApi({ baseURL })
}

module.exports = { createArbiscanApi }
