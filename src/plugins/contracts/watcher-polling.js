//@ts-check
/** @type {typeof import('web3-eth-abi').default} */
//@ts-ignore
const abi = require('web3-eth-abi')
const { sleep } = require('../explorer/watcher-helpers')

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
  /** @type {(error: any) => void} */
  onError = null

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
    this.lastSyncedBlock = 0
  }

  /** @param { (contractID: string) => void} onChange */
  startWatching(onChange, onError, fromBlock) {
    if (this.job !== null) {
      throw new Error('Already started')
    }
    this.lastSyncedBlock = +fromBlock
    this.onChange = onChange
    this.onError = onError
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

      try {
        const changes = await this.getChanges()
  
        for (const log of changes) {
          if (this.stop) {
            break
          }
  
          const { topics, blockNumber, data } = log
          const [eventTopic, contractAddressTopic] = topics
          const contractAddress = this.decodeAddress(data, contractAddressTopic)
          switch (eventTopic) {
            case CONTRACT_CLOSED_SIG:
              this.onChange(contractAddress)
              break
            case CONTRACT_PURCHASED_SIG:
              this.onChange(contractAddress)
              break
            case CONTRACT_DELETE_UPDATED_SIG:
              this.onChange(contractAddress)
              break
            case CONTRACT_CREATED_SIG:
              this.onChange(contractAddress)
              break
            case CONTRACT_UPDATED_SIG:
              this.onChange(contractAddress)
              break
          }
  
          if (+this.lastSyncedBlock < blockNumber) {
            this.lastSyncedBlock = blockNumber
          }
        } 
      } catch (err) {
        this.onError(err)
      }

      await sleep(this.pollingIntervalMs)
    }
  }

  decodeAddress(data, topic) {
    return this.web3.eth.abi.decodeLog(
      [
        {
          type: 'address',
          name: '_address',
          indexed: true,
        },
      ],
      data,
      topic
    )._address
  }

  async getChanges() {
    const options = {
      fromBlock: this.lastSyncedBlock,
      toBlock: 'latest',
      address: this.cloneFactory._address,
    }
    const changes = await this.web3.eth.getPastLogs({
      ...options,
      topics: [
        [
          CONTRACT_CREATED_SIG,
          CONTRACT_PURCHASED_SIG,
          CONTRACT_DELETE_UPDATED_SIG,
          CONTRACT_CLOSED_SIG,
          CONTRACT_UPDATED_SIG,
        ],
      ],
    })
    return changes
  }
}

module.exports = {
  WatcherPolling,
}
