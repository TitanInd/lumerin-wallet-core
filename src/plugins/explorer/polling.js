//@ts-check
const { Lumerin, CloneFactory } = require('contracts-js')
const EventEmitter = require('events')
/**
 * @type {typeof import('web3-eth-abi').default}
 */
//@ts-ignore
const abi = require('web3-eth-abi');
const { promisify } = require('util')


class SubscriptionPolling {
  /** @type {import('contracts-js').LumerinContext} */
  lumerin = null
  /** @type {import('contracts-js').CloneFactoryContext} */
  clonefactory = null

  /**
   * @param {import('web3').default} web3
   * @param {string} lmrAddress
   * @param {string} cfAddr
   * @param {number} pollingIntervalMs
   */
  constructor(web3, lmrAddress, cfAddr, pollingIntervalMs = 3000) {
    this.web3 = web3
    this.lumerin = Lumerin(web3, lmrAddress)
    this.clonefactory = CloneFactory(web3, cfAddr)
    this.pollingIntervalMs = pollingIntervalMs
  }

  /**
   * 
   * @param {string} address 
   * @param {number} fromBlock 
   * @param {number|"latest"} toBlock 
   * @return {Promise<import("ethereum-abi-types-generator").EventData[]>}
   */
  async getPastTransactions(address, fromBlock, toBlock = "latest") {
    return await this.lumerin.getPastEvents('Transfer', {
      fromBlock: fromBlock,
      toBlock: toBlock,
      filter: [{
        from: address,
      }, { to: address }]
    })
  }

  /**
   * @param {string} address 
   * @param {number} fromBlock
   * @returns {import("ethereum-abi-types-generator").EventResponse}
   */
  watchLMRTransactions(address, fromBlock) {
    const eventEmitter = new EventEmitter()
    let from = fromBlock || 0;

    const poll = async () => {
      const events = await this.lumerin.getPastEvents('Transfer', {
        fromBlock: from,
        toBlock: "latest",
        filter: {
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
        }
      })
      if (events.length > 0) {
        from = events[events.length - 1].blockNumber + 1;
      }
      events.forEach(event => eventEmitter.emit('data', event))
    }

    setInterval(poll, this.pollingIntervalMs)
    return eventEmitter
  }

  watchETHTransactions(address) {

  }

  watchContractEvents(address) {

  }

  /**
   * 
   * @param {string} walletAddress 
   * @param {string[]} contractAddresses 
   */
  async watchAllEvents(walletAddress, contractAddresses) {
    // const batch = new this.web3.BatchRequest()
    // batch.add({
    //   name: 'eth_getLogs',
    // })

    const filter = await this.sendRaw({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_newFilter',
      params: [{
        address: [
          this.lumerin._address,
          this.clonefactory._address,
        ],
        fromBlock: '0x0',
        toBlock: 'latest',
        topics: [
          [
            abi.encodeEventSignature('Transfer(address,address,uint256)'),
            abi.encodeEventSignature('clonefactoryContractPurchased(address,address)'),
            abi.encodeEventSignature('contractDeleteUpdated(address,bool)'),
            abi.encodeEventSignature('purchaseInfoUpdated(address)'),
            abi.encodeEventSignature('contractClosed(address,uint256)'),
          ],
          [
            abi.encodeParameter('address', walletAddress),
            ...contractAddresses.map(addr => abi.encodeParameter('address', addr))
          ],
        ]
      }],
    })

    const eventEmitter = new EventEmitter()
    const poll = async () => {
      const events = await this.sendRaw({
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_getFilterChanges',
        params: [filter.result],
      })
      events.result.forEach(event => eventEmitter.emit('data', event))
    }

    setInterval(poll, this.pollingIntervalMs)

    return eventEmitter
  }

  /**
   * @param {import("web3-core-helpers").JsonRpcPayload} params 
   * @returns {Promise<import("web3-core-helpers").JsonRpcResponse>}
   */
  sendRaw(params) {
    /** @type {import('web3-core').HttpProvider} */
    //@ts-ignore
    const provider = this.web3.currentProvider
    return promisify(provider.send.bind(provider))(params)
  }
}

/**
 * @typedef {Object} TransferEvent
 * @property {"transfer"} type
 * @property {string} txhash
 * @property {string} internalId internal identifier, incremental, used in cases when one blockchain tx represents two transaction in multiple tokens 
 * @property {"LMR"|"ETH"} token 
 * @property {string} from
 * @property {string} to
 * @property {string} amount
 * @property {string} timestamp
 */

/**
 * @typedef {Object} ContractEvent
 * @property {"contract"} type
 * @property {string} txhash
 * @property {string} internalId
 * @property {string} contractID
 * @property {string} eventName
 * @property {string} timestamp 
 */

module.exports = {
  SubscriptionPolling,
}