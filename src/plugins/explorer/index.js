'use strict';

const logger = require('../../logger');

const Web3 = require('web3');
const { Lumerin, CloneFactory } = require('contracts-js');

const createBlockStream = require('./blocks-stream');
const { createExplorer } = require('./explorer');

function createPlugin() {
  let blocksStream;
  /** @type {import('./explorer').Explorer} */
  let explorer = null;

  function start({ config, eventBus, plugins }) {
    // debug.enabled = config.debug;

    /** @type { import('web3').default } */
    const web3 = plugins.eth.web3

    const lumerin = Lumerin(web3, config.lmrTokenAddress);
    const cf = CloneFactory(web3, config.cloneFactoryAddress);

    explorer = createExplorer(config.chainId, web3, lumerin, config.walletAddress, cf);
    explorer.startWatching(
      (tx) => eventBus.emit('token-transactions-changed', [tx]),
      (err) => eventBus.emit('wallet-error', {
        inner: err,
        message: 'Could not get latest transactions',
        meta: { plugin: 'explorer' },
      })
    )

    logger.debug('Initiating blocks stream');
    blocksStream = createBlockStream(web3, config.blocksUpdateMs);

    blocksStream.stream.on('data', function ({ hash, number, timestamp }) {
      logger.debug('New block', hash, number);
      eventBus.emit('coin-block', { hash, number, timestamp });
    }).on('error', function (err) {
      logger.debug('Could not get latest block');
      eventBus.emit('wallet-error', {
        inner: err,
        message: 'Could not get latest block',
        meta: { plugin: 'explorer' }
      });
    });

    return {
      api: {
        logTransaction: explorer.logTransaction,
        refreshAllTransactions: () => explorer.getTransactions('0', 'latest', 0, 100), // TODO: keep only one method
        getPastCoinTransactions: () => explorer.getTransactions('0', 'latest', 0, 100),
        syncTransactions: () => explorer.getTransactions('0', 'latest', 0, 100),
      },
      events: [
        'token-transactions-changed',
        'coin-block',
        'wallet-error'
        // 'wallet-state-changed',
        // 'transactions-next-page', // todo: query until empty response on the the client side
        // 'indexer-connection-status-changed',
      ],
      name: 'explorer'
    };
  }

  function stop() {
    blocksStream.stop()
    explorer.stopWatching()
  }

  return {
    start,
    stop
  };
}

module.exports = createPlugin
