'use strict';

const debug = require('debug')('lmr-wallet:core:explorer');
const Web3 = require('web3');
const { Lumerin } = require('contracts-js');

const createEventsRegistry = require('./events');
const createLogTransaction = require('./log-transaction');
const { createLogTransactionV2 } = require('./log-transaction-v2');
const createQueue = require('./queue');
const createStream = require('./blocks-stream');
const createTransactionSyncer = require('./sync-transactions');
const refreshTransaction = require('./refresh-transactions');
const tryParseEventLog = require('./parse-log');
const createExplorer = require('./explorer');

function createPlugin () {
  let blocksStream;
  let syncer;

  function start ({ config, eventBus, plugins }) {
    debug.enabled = config.debug;
    const { lmrTokenAddress } = config;

    const web3 = new Web3(plugins.eth.web3Provider);

    const web3Subscribable = new Web3(plugins.eth.web3SubscriptionProvider);

    const eventsRegistry = createEventsRegistry();
    const queue = createQueue(config, eventBus, web3);
    const lumerin = Lumerin(web3Subscribable, lmrTokenAddress);

    const explorer = createExplorer(config.chainId, web3, lumerin, eventBus);

    syncer = createTransactionSyncer(
      config,
      eventBus,
      web3,
      queue,
      eventsRegistry,
      explorer
    );

    debug('Initiating blocks stream');
    blocksStream = createStream(web3Subscribable);
    blocksStream.on('data', function ({ hash, number, timestamp }) {
      debug('New block', hash, number);
      eventBus.emit('coin-block', { hash, number, timestamp });
    });
    blocksStream.on('error', function (err) {
      debug('Could not get latest block');
      eventBus.emit('wallet-error', {
        inner: err,
        message: 'Could not get latest block',
        meta: { plugin: 'explorer' }
      });
    });

    return {
      api: {
        // logTransaction: createLogTransaction(queue),
        logTransaction: createLogTransactionV2(queue),
        refreshAllTransactions: syncer.refreshAllTransactions,
        refreshTransaction: refreshTransaction(web3, eventsRegistry, queue),
        registerEvent: eventsRegistry.register,
        syncTransactions: syncer.syncTransactions,
        tryParseEventLog: tryParseEventLog(web3, eventsRegistry),
        getPastCoinTransactions: syncer.getPastCoinTransactions,
      },
      events: [
        'token-transactions-changed',
        'wallet-state-changed',
        'coin-block',
        'transactions-next-page',
        'indexer-connection-status-changed',
        'wallet-error'
      ],
      name: 'explorer'
    };
  }

  function stop () {
    // blocksStream.destroy();
    blocksStream.unsubscribe();
    syncer.stop();
  }

  return {
    start,
    stop
  };
}

module.exports = createPlugin
