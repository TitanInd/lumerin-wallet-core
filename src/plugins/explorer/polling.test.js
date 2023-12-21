/**
 * @type {typeof import('web3').default}
 */
//@ts-ignore
const Web3 = require('web3')
const { SubscriptionPolling } = require('./polling')

const web3 = new Web3('http://localhost:8545')

const lumerinAddr = process.env.LUMERIN_ADDRESS || ""
const walletAddr = process.env.WALLET_ADDRESS || ""
const cfAddr = process.env.CLONEFACTORY_ADDRESS || ""

if (!lumerinAddr || !walletAddr || !cfAddr) {
  throw new Error('LUMERIN_ADDRESS or WALLET_ADDRESS or CLONEFACTORY_ADDRESS env variables must be set')
}

new SubscriptionPolling(web3, lumerinAddr, cfAddr)
  // .watchLMRTransactions(walletAddr, 0)
  .watchAllEvents(walletAddr, [])
  .then(emitter => {
    emitter.on('data', (data) => {
      console.log('data', data)
    })
    emitter.on('error', (error) => {
      console.log('error', error)
    })
  })


