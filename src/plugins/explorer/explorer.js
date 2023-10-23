'use strict'

const pRetry = require('p-retry');
const { createExplorerApis } = require('./api/factory');
const { mapLMRResToTxEvent, mapETHResToTxEvent, mapSentTxToTxEvent, mergeTxs } = require('./explorer-mapper')
const { sleep } = require('./watcher-helpers');

/**
 * @typedef {import('contracts-js').LumerinContext} LumerinContext
 * @typedef {import('contracts-js').CloneFactoryContext} CloneFactoryContext
 * @typedef {import('web3').default} Web3
 * @typedef {import("web3-core").Transaction} Transaction
 * @typedef {import("web3-core").TransactionReceipt} TransactionReceipt
 */

/**
 * @param {string} chainId 
 * @param {Web3} web3 
 * @param {LumerinContext} lumerin 
 * @param {string} walletAddress 
 * @param {CloneFactoryContext} cloneFactory 
 */
const createExplorer = (chainId, web3, lumerin, walletAddress, cloneFactory) => {
  const apis = createExplorerApis(chainId);
  return new Explorer({ apis, lumerin, web3, walletAddress, cloneFactory })
}

class Explorer {
  /** @type {LumerinContext} */
  lumerin = null;
  /** @type {CloneFactoryContext} */
  cloneFactory = null
  /** @type {Web3} */
  web3 = null;
  /** @type {Indexer[]} */
  apis = [];
  latestSyncedBlock = 0;
  walletAddress = "0x0"
  stop = false;
  /** @type {Promise<void> | null} */
  job = null;
  pollingIntervalMs = 0;
  pageSize = 3; // number of txs retrieved in one call
  /** @type {(txEvent: TransactionEvent) => void | null} onChange */
  onChange = null;

  constructor({ apis, lumerin, cloneFactory, web3, walletAddress, pollingIntervalMs = 5000 }) {
    this.apis = apis
    this.lumerin = lumerin
    this.cloneFactory = cloneFactory
    this.web3 = web3
    this.walletAddress = walletAddress
    this.pollingIntervalMs = pollingIntervalMs
  }

  /**
   * Returns list of transactions for ETH and LMR token
   * @param {string} from start block
   * @param {string} to end block
   * @returns {Promise<TransactionEvent[]>}
   */
  async getTransactions(from, to, page, pageSize) {
    //@ts-ignore
    const lmrTransactions = await this.invoke('getTokenTransactions', from, to, this.walletAddress, this.lumerin._address, page, pageSize)
    const ethTransactions = await this.invoke('getEthTransactions', from, to, this.walletAddress, page, pageSize)

    const abis = this.abis()

    return mergeTxs([
      ...lmrTransactions.map(mapLMRResToTxEvent),
      ...ethTransactions.map((item) => mapETHResToTxEvent(abis, item))
    ])
  }

  /**
   * Wraps the transaction call and emits event with a parsed transaction data
   * @param {PromiEvent<any>} promiEvent 
   * @returns {Promise<{ receipt: import("web3-core").TransactionReceipt }>}
   */
  logTransaction(promiEvent) {
    if (!promiEvent.once) {
      return
    }

    const onChange = this.onChange
    const abis = this.abis()

    return new Promise(function (resolve, reject) {
      const txData = {
        /** @type {Partial<Transaction>} */
        transaction: null,
        /** @type {TransactionReceipt} */
        receipt: null,
      }

      promiEvent
        .once('sending', function (payload) {
          txData.transaction = payload.params[0]
        })
        .once('receipt', function (receipt) {
          txData.receipt = receipt
          const tx = mapSentTxToTxEvent(abis, txData)
          if (onChange) {
            onChange(tx)
          }
          resolve({ receipt });
        })
        .once('error', function (err) {
          promiEvent.removeAllListeners();
          reject(err);
        });
    });
  }

  /** 
   * Starts watching for new transactions in background
   * @param {(txId: TransactionEvent) => void} onChange 
   * @param {(e: Error) => void} onError 
   */
  startWatching(onChange, onError) {
    if (this.job) {
      throw new Error('Already watching')
    }
    this.onChange = onChange
    this.onError = onError
    this.job = this.poll()
  }

  /** 
   * Stops watching for new transactions in background
   */
  async stopWatching() {
    this.stop = true
    await this.job
    this.job = null
  }

  async poll() {
    for (; ;) {
      for (let page = 1; ; page++) {
        if (this.stop) {
          return
        }
        try {
          const txs = await this.getTransactions(String(this.latestSyncedBlock), "latest", page, this.pageSize)
          for (const tx of txs) {
            this.onChange(tx)
            if (tx.blockNumber > this.latestSyncedBlock) {
              this.latestSyncedBlock = tx.blockNumber
            }
          }
          if (!txs.length) {
            break;
          }
        } catch (err) {
          this.onError(err)
        }
      }
      await sleep(this.pollingIntervalMs)
    }
  }

  /**
   * Helper method that attempts to make a function call for multiple providers
   * @param {keyof Indexer} methodName 
   * @param  {...any} args 
   * @returns {Promise<any>}
   * @private
   */
  async invoke(methodName, ...args) {
    return await pRetry(async () => {
      let lastErr

      for (const api of this.apis) {
        try {
          //@ts-ignore
          return await api[methodName](...args)
        } catch (err) {
          lastErr = err
        }
      }

      throw new Error(`Explorer error, tried all of the providers without success, ${lastErr}`)
      //@ts-ignore
    }, { minTimeout: 5000, retries: 5 })
  }

  /**
   * @returns {AbiItemSignature[]}
   */
  abis() {
    //@ts-ignore
    return [...this.lumerin._jsonInterface, ...this.cloneFactory._jsonInterface]
  }

}

module.exports = {
  createExplorer,
  Explorer,
}