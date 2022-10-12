'use strict';

const debug = require('debug')('lmr-wallet:core:contracts');
const Web3 = require('web3');

const { getActiveContracts, createContract, cancelContract } = require('./api');

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin () {
  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ events: string[] }} The instance details.
   */
  function start ({ config, eventBus, plugins }) {
    const { cloneFactoryAddress, lmrTokenAddress } = config;
    const { eth } = plugins;
    const web3 = new Web3(eth.web3Provider);
    const lumerinContracts = new LumerinContracts(web3, cloneFactoryAddress, lmrTokenAddress);


    const refreshContracts = (web3, lumerinContracts) => () => {
      eventBus.emit('contracts-scan-started', {});

      return getActiveContracts(web3, lumerinContracts)
        .then((contracts) => {
          console.log('----------------------------------------   ', { contracts })
          eventBus.emit('contracts-scan-finished', {
            actives: contracts
          });
        })
        .catch(function (error) {
          console.log('Could not sync contracts/events', error.stack);
          return {};
        });
    }

    return {
      api: {
        refreshContracts: refreshContracts(web3, lumerinContracts),
        createContract: createContract(web3, lumerinContracts, plugins),
        cancelContract: cancelContract(web3, lumerinContracts)
      },
      events: [
        'contracts-scan-started',
        'contracts-scan-finished',
      ],
      name: 'contracts'
    };
  }

  /**
   * Stop the plugin instance.
   */
  function stop () {
    debug('Plugin stopping');
  }

  return {
    start,
    stop
  };
}

module.exports = createPlugin;
