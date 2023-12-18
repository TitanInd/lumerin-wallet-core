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

    explorer = createExplorer(config.explorerApiURLs, web3, lumerin, cf);

    logger.debug('Initiating blocks stream');
    blocksStream = createBlockStream(web3, config.blocksUpdateMs);

    blocksStream.stream.on('data', function ({ hash, number, timestamp }) {
      logger.debug('New block', hash, number);
      eventBus.emit('coin-block', { hash, number, timestamp });
      eventBus.emit('web3-connection-status-changed', { connected: true });
    }).on('error', function (err) {
      logger.debug('Could not get latest block');
      eventBus.emit('wallet-error', {
        inner: err,
        message: 'Could not get latest block',
        meta: { plugin: 'explorer' }
      });
      eventBus.emit('web3-connection-status-changed', { connected: false });
    });

    return {
      api: {
        logTransaction: explorer.logTransaction,
        refreshAllTransactions: async ({ walletAddress }) => { 
          // console.log("🚀 ~ file: index.js:46 ~ refreshAllTransactions: ~ walletAddress:", walletAddress)
          // const txs = await explorer.getTransactions('0', 'latest', 0, 10, walletAddress); // TODO: keep only one method
          // console.log("🚀 ~ file: index.js:55 ~ refreshAllTransactions: ~ txs:", txs)
          // eventBus.emit('token-transactions-changed', txs);
        },
        syncTransactions: async (from, to, page, pageSize, walletAddress) =>  { 
          console.log("🚀 ~ file: index.js:52 ~ syncTransactions: ~ args:", from, to, page, pageSize, walletAddress)
          const txs = await explorer.getTransactions(from, to, page, pageSize, walletAddress);
          if(page && pageSize) {
            const hasNextPage = txs.length;
            eventBus.emit('transactions-next-page', {
              hasNextPage: Boolean(hasNextPage),
              page: page + 1,
            })
          }

          eventBus.emit('token-transactions-changed', txs);
          return txs;
        },
        startWatching: ({ walletAddress }) => {
          explorer.startWatching(
            walletAddress,
            (tx) => eventBus.emit('token-transactions-changed', [tx]),
            (err) => eventBus.emit('wallet-error', {
              inner: err,
              message: 'Could not get latest transactions',
              meta: { plugin: 'explorer' },
            })
          )
        },
        stop: () => explorer.stopWatching(),
      },
      events: [
        'token-transactions-changed',
        'coin-block',
        'wallet-error',
        'web3-connection-status-changed',
        // 'wallet-state-changed',
        'transactions-next-page', // todo: query until empty response on the the client side
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
