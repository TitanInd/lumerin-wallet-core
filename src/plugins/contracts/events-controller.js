const { getContract } = require('./api');

/**
 * Interface for a contract watcher
 * @typedef Watcher
 * @prop {(onChange: (contractID: string) => void, onError: (e: Error) => void) => void} startWatching
 * @prop {() => Promise<void>} stopWatching
 */

class EventsController {
  /** @type {Watcher} */
  watcher = null
  /** @type {string} */
  walletAddress = null
  /** @type {import('web3').default} */
  web3 = null
  /** @type {import("node:events").EventEmitter} */
  eventBus = null
  /** @type {import('contracts-js').CloneFactoryContext} */
  cloneFactory = null

  /**
   * @param {import('web3').default} web3 
   * @param {import("node:events").EventEmitter} eventBus 
   * @param {Watcher} watcher 
   * @param {string} walletAddress
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   */
  constructor(web3, eventBus, watcher, walletAddress, cloneFactory) {
    this.web3 = web3;
    this.watcher = watcher;
    this.walletAddress = walletAddress;
    this.eventBus = eventBus;
    this.cloneFactory = cloneFactory;
  }

  /**
   * Pulls all contracts and starts watching in the background
   * @returns {Promise<void>}
   */
  async start() {
    await this.refreshContracts()
    this.watcher.startWatching(this.updateContract, (e) => {
      this.eventBus.emit('wallet-error', {
        inner: e,
        message: 'Could not update contract state',
        meta: { plugin: 'contracts' },
      })
    })
  }

  /**
   * Stops watching contracts is the background. Resolves when watching is finished.
   */
  async stop() {
    await this.watcher.stopWatching()
  }

  /**
   * Arbitratily refreshes all contracts
   */
  async refreshContracts() {
    this.eventBus.emit('contracts-scan-started')
    const contractIDs = await this.cloneFactory.methods.getContractList().call()
    for (const contractID of contractIDs) {
      await this.updateContract(contractID)
    }
    this.eventBus.emit("contracts-scan-finished")
  }

  /** 
   * Arbitrary refreshes single contract
   * @param {string} contractID 
   */
  async updateContract(contractID) {
    const data = await getContract(this.web3, contractID, this.walletAddress)
    this.eventBus.emit('contracts-updated', {
      actives: [data],
    })
  }
}

module.exports = {
  EventsController,
}