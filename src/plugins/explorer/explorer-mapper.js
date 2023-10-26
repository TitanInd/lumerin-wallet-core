const { decodeAbiSignature, decodeEvent } = require("./watcher-helpers")

/**
 * @typedef {import("web3-core").Transaction} Transaction
 * @typedef {import("web3-core").TransactionReceipt} TransactionReceipt
 */

/**
 * Maps external indexer tokentx call response to TransactionEvent
 * @param {TokenTxResItem} tx 
 * @returns {TransactionEvent}
 */
function mapLMRResToTxEvent(tx) {
  return {
    type: "transfer",
    timestamp: tx.timeStamp,
    txhash: tx.hash,
    blockNumber: Number(tx.blockNumber),
    transactionFee: Number(tx.gasPrice) * Number(tx.gasUsed),
    transfers: [
      {
        from: tx.from,
        to: tx.to,
        amount: tx.value,
        token: "LMR"
      }
    ]
  }
}

/**
  * Maps external indexer txlist call response to TransactionEvent
  * @param {AbiItemSignature[]} contractAbi
  * @param {TxListResItem} tx 
  * @returns {TransactionEvent}
  */
function mapETHResToTxEvent(contractAbi, tx) {
  const funcName = decodeAbiSignature(contractAbi, tx.methodId)
  const type = mapContractCallToTxType(funcName?.name)
  return {
    timestamp: tx.timeStamp,
    txhash: tx.hash,
    type: type,
    blockNumber: Number(tx.blockNumber),
    transactionFee: Number(tx.gasPrice) * Number(tx.gasUsed),
    transfers: [
      {
        from: tx.from,
        to: tx.to,
        amount: tx.value,
        token: "ETH"
      }
    ]
  }
}

/**
  * Merges calls to tokenTx and txList into one list of transactions
  * @param {TransactionEvent[]} txs 
  * @returns {TransactionEvent[]}
  */
function mergeTxs(txs) {
  /** @type {Map<string, TransactionEvent>} */
  const txsMap = new Map()
  for (const tx of txs) {
    const existingTx = txsMap.get(tx.txhash)
    if (existingTx) {
      existingTx.transfers.push(...tx.transfers)
      if (tx.type !== 'transfer') {
        existingTx.type = tx.type
      }
    } else {
      txsMap.set(tx.txhash, tx)
    }
  }
  return Array.from(txsMap.values())
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
}

/**
 * Maps sent transaction data and receipt to TransactionEvent
 * @param {AbiItemSignature[]} contractAbi
 * @param {Object} obj
 * @param {Partial<Transaction>} obj.transaction
 * @param {TransactionReceipt} obj.receipt 
 * @returns {TransactionEvent}
 */
function mapSentTxToTxEvent(contractAbi, { transaction, receipt }) {
  const logs = receipt.logs

  /** @type {TransactionEvent['transfers']} */
  const transfers = [{
    from: transaction.from,
    to: transaction.to,
    amount: transaction.value,
    token: "ETH"
  }]

  /** @type {TransactionType} */
  let eventType = "transfer"
  for (const log of logs) {
    try {
      //@ts-ignore
      const event = decodeEvent(contractAbi, log)
      if (event.eventName === 'Transfer') {
        transfers.push({
          from: event.from,
          to: event.to,
          amount: event.value,
          token: "LMR"
        })
      }
      const type = mapEventToTxType(event.eventName)
      if (type !== 'transfer') {
        eventType = type
      }
    } catch (err) {
      console.log(err);
    }
  }

  return {
    blockNumber: Number(receipt.blockNumber),
    timestamp: `${Date.now()}`,
    txhash: receipt.transactionHash,
    type: eventType,
    transactionFee: Number(receipt.effectiveGasPrice) * Number(receipt.gasUsed),
    transfers: transfers,
  }
}

/**
 * Maps contract call returned by indexer to transaction type
 * @param {string | undefined} contractCall 
 * @returns {TransactionType}
 */
function mapContractCallToTxType(contractCall) {
  switch (contractCall) {
    case 'setPurchaseRentalContract':
      return 'purchase'
    case 'setCreateNewRentalContract':
      return 'create'
    case 'setContractDeleted':
      return 'delete'
    case 'setUpdateContractInformation':
      return 'update'
    case 'setContractCloseout':
      return 'closeout'
    default:
      return 'transfer'
  }
}

/**
 * Maps event returned by eth node getTransaction call to transaction type
 * @param {string | undefined} eventName 
 * @returns {TransactionType}
 */
function mapEventToTxType(eventName) {
  switch (eventName) {
    case 'contractClosed':
      return 'closeout'
    case 'purchaseInfoUpdated':
      return 'update'
    case 'contractCreated':
      return 'create'
    case 'clonefactoryContractPurchased':
      return 'purchase'
    case 'contractDeleteUpdated':
      return 'delete'
    default:
      return 'transfer'
  }
}

module.exports = {
  mapLMRResToTxEvent,
  mapETHResToTxEvent,
  mapSentTxToTxEvent,
  mergeTxs,
  mapContractCallToTxType,
  mapEventToTxType,
}