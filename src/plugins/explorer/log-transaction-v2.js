const createLogTransactionV2 = queue =>
  function (promiEvent, from, metaParser) {
    if (promiEvent.once) {
      return new Promise(function (resolve, reject) {
        /**
         * @type {Partial<import("web3-core").Transaction>}
         */
        let transaction = {};
        promiEvent
          .once('sending', function(payload){ 
            const params = payload.params[0]
            transaction = {
              from: params.from,
              to: params.to,
              value: params.value,
              input: params.data,
              gas: params.gas,
              gasPrice: params.gasPrice,
              maxFeePerGas: params.maxFeePerGas,
              maxPriorityFeePerGas: params.maxPriorityFeePerGas,
            }
          })
          .once('receipt', function (receipt) {
            // todo: get from to value from return data
            transaction.hash = receipt.transactionHash
            queue.addTx(from, metaParser)({ transaction, receipt })
            resolve({ receipt });
          })
          .once('error', function (err) {
            promiEvent.removeAllListeners();
            reject(err);
          });
      });
    }

    // This is not a wrapped PromiEvent object. It shall be a plain promise
    // instead.
    return promiEvent.then(function (receipt) {
      queue.addTransaction(from)(receipt.transactionHash);
      return { receipt };
    });
  }

module.exports = {
  createLogTransactionV2,
}