const { createArbiscanApi } = require('./arbiscan-factory')
const { createBlockscoutApi } = require('./blockscout-factory')
const { createEtherscanApi } = require('./etherscan-factory')

const createExplorerApis = (chainId) => {
  const apis = []

  switch (chainId.toString()) {
    case 'mainnet':
    case '1':
    case 'goerli':
    case '5':
    case 'sepolia':
    case '11155111':
      const etherscanApi = createEtherscanApi(chainId)
      const blockscoutApi = createBlockscoutApi(chainId)
      apis.push(etherscanApi, blockscoutApi)
      break
    case '421613':
    case '42161':
      const arbiscanApi = createArbiscanApi(chainId)
      apis.push(arbiscanApi)
      break
    default:
      throw new Error(`Unsupported chain ${chainId}`)
  }

  return apis;
}

module.exports = { createExplorerApis }
