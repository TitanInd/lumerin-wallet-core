const logger = require('../../logger');
const { getContract } = require('./api');

/**
 * Interface for a contract watcher
 * @typedef Watcher
 * @prop {(onChange: (contractID: string) => void, onError: (e: Error) => void, block: number) => void} startWatching
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
    const lastBlock = await this.web3.eth.getBlockNumber()
    this.watcher.startWatching(this.updateContract.bind(this), (e) => {
      logger.error(`WatcherPolling error: ${e}`)
      this.eventBus.emit('wallet-error', {
        inner: e,
        message: 'Could not update contract state',
        meta: { plugin: 'contracts' },
      })
    }, lastBlock)
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
    const contractIDs = await this.cloneFactory.methods.getContractList().call();

    // cannot use .revese() because it mutates the original array, which is not allowed in readonly {contractIDs}
    const reversedContracts = [];
    for (let i = contractIDs.length - 1; i >= 0; i--) {
      reversedContracts.push(contractIDs[i]);
    }

    const chunkSize = 5;
    for (let i = 0; i < reversedContracts.length; i += chunkSize) {
      const chunk = reversedContracts.slice(i, i + chunkSize);
      await Promise.all(chunk.map((id) => this.updateContract(id)))
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