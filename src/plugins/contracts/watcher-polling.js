//@ts-check
/** @type {typeof import('web3-eth-abi').default} */
//@ts-ignore
const abi = require('web3-eth-abi')
const { promisify } = require('util')
const { decodeEvent, jsonrpcid, sleep } = require('../explorer/watcher-helpers')
const logger = require('../../logger')

const CONTRACT_CREATED = 'contractCreated(address,string)'
const CONTRACT_PURCHASED = 'clonefactoryContractPurchased(address,address)'
const CONTRACT_DELETE_UPDATED = 'contractDeleteUpdated(address,bool)'
const CONTRACT_CLOSED = 'contractClosed(address,uint256)'
const CONTRACT_UPDATED = 'purchaseInfoUpdated(address)'

const CONTRACT_CREATED_SIG = abi.encodeEventSignature(CONTRACT_CREATED)
const CONTRACT_PURCHASED_SIG = abi.encodeEventSignature(CONTRACT_PURCHASED)
const CONTRACT_DELETE_UPDATED_SIG = abi.encodeEventSignature(
  CONTRACT_DELETE_UPDATED
)
const CONTRACT_CLOSED_SIG = abi.encodeEventSignature(CONTRACT_CLOSED)
const CONTRACT_UPDATED_SIG = abi.encodeEventSignature(CONTRACT_UPDATED)

class WatcherPolling {
  /** @type {import('contracts-js').CloneFactoryContext} */
  cloneFactory = null
  /** @type {boolean} */
  stop = false
  /** @type {Promise<void>} */
  job = null
  /** @type {Map<string, import('contracts-js/dist/generated-types/Implementation').GetPublicVariablesResponse>} */
  contracts = new Map()
  /** @type {(contractID: string) => void} */
  onChange = null

  /**
   * @param {import('web3').default} web3
   * @param {string} walletAddress
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   * @param {number} pollingIntervalMs
   */
  constructor(web3, walletAddress, cloneFactory, pollingIntervalMs = 3000) {
    this.web3 = web3
    this.walletAddress = walletAddress
    this.cloneFactory = cloneFactory
    this.pollingIntervalMs = pollingIntervalMs
  }

  /** @param { (contractID: string) => void} onChange */
  startWatching(onChange) {
    if ((this.job = null)) {
      throw new Error('Already started')
    }
    this.onChange = onChange
    this.stop = false
    this.job = this.poller()
  }

  async stopWatching() {
    this.stop = true
    await this.job
    this.job = null
  }

  /**
   * @private
   * @returns {Promise<void>}
   */
  async poller() {
    for (;;) {
      if (this.stop) {
        return
      }

      const filter = await this.createFilter()

      if (filter.error) {
        logger.error(filter.error.message)
        await sleep(this.pollingIntervalMs)
        continue;
      }
      //@ts-ignore
      const contractAbi = this.cloneFactory._jsonInterface

      for (;;) {
        const changes = await this.sendRaw({
          id: jsonrpcid(),
          jsonrpc: '2.0',
          method: 'eth_getFilterChanges',
          params: [filter.result],
        })

        if (changes.error) {
          logger.error(changes.error.message)
          await sleep(this.pollingIntervalMs)
          break;
        }

        for (const event of changes.result) {
          if (this.stop) {
            break
          }

          switch (event.topics[0]) {
            case CONTRACT_CREATED_SIG:
              this.onChange(decodeEvent(contractAbi, event)._address)
              break
            case CONTRACT_PURCHASED_SIG:
              this.onChange(decodeEvent(contractAbi, event)._address)
              break
            case CONTRACT_DELETE_UPDATED_SIG:
              this.onChange(decodeEvent(contractAbi, event)._address)
              break
            case CONTRACT_CLOSED_SIG:
              this.onChange(decodeEvent(contractAbi, event)._address)
              break
            case CONTRACT_UPDATED_SIG:
              this.onChange(decodeEvent(contractAbi, event)._address)
              break
          }
        }

        await sleep(this.pollingIntervalMs)
      }
    }
  }

  // monitors all contracts
  async createFilter() {
    return await this.sendRaw({
      id: jsonrpcid(),
      jsonrpc: '2.0',
      method: 'eth_newFilter',
      params: [
        {
          address: [
            //@ts-ignore
            this.cloneFactory._address,
          ],
          // fromBlock: '0x0',
          toBlock: 'latest',
          topics: [
            [
              CONTRACT_CREATED_SIG,
              CONTRACT_PURCHASED_SIG,
              CONTRACT_DELETE_UPDATED_SIG,
              CONTRACT_CLOSED_SIG,
              CONTRACT_UPDATED_SIG,
            ],
          ],
        },
      ],
    })
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

module.exports = {
  WatcherPolling,
}
