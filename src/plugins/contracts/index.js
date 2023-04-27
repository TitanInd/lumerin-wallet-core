//@ts-check
'use strict'

const debug = require('debug')('lmr-wallet:core:contracts')
const { Lumerin, CloneFactory } = require('contracts-js')

/**
 * @type {typeof import('web3').default}
 */
//@ts-ignore
const Web3 = require('web3')

const {
  getContracts,
  createContract,
  cancelContract,
  purchaseContract,
} = require('./api')
const { ContractEventsListener } = require('./events-listener')

/**
 * Create a plugin instance.
 *
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin() {
  /**
   * Start the plugin instance.
   *
   * @param {object} options Start options.
   * @returns {{ api: {[key: string]:any}, events: string[], name: string }} The instance details.
   */
  function start({ config, eventBus, plugins }) {
    const { lmrTokenAddress, cloneFactoryAddress } = config
    const { eth } = plugins

    const web3 = new Web3(eth.web3Provider)
    const lumerin = Lumerin(web3, lmrTokenAddress)
    const cloneFactory = CloneFactory(web3, cloneFactoryAddress)

    const refreshContracts = (web3, lumerin, cloneFactory) => async (contractId) => {
      eventBus.emit('contracts-scan-started', {})

      const addresses = contractId ? [contractId] : await cloneFactory.methods
        .getContractList()
        .call()
        .catch((error) => {
          debug('cannot get list of contract addresses:', error)
          throw error
        })

      return getContracts(web3, lumerin, addresses)
        .then((contracts) => {
          eventBus.emit('contracts-scan-finished', {
            actives: contracts,
          })
        })
        .catch(function (error) {
          console.log('Could not sync contracts/events', error.stack)
          throw error
        })
    }

    const contractEventsListener = ContractEventsListener.create(
      cloneFactory,
      config.debug
    );

    contractEventsListener.setOnUpdate(
      refreshContracts(web3, lumerin, cloneFactory)
    )

    return {
      api: {
        refreshContracts: refreshContracts(web3, lumerin, cloneFactory),
        createContract: createContract(web3, cloneFactory, plugins),
        cancelContract: cancelContract(web3),
        purchaseContract: purchaseContract(web3, cloneFactory, lumerin),
      },
      events: ['contracts-scan-started', 'contracts-scan-finished', 'contract-updated'],
      name: 'contracts',
    }
  }

  /**
   * Stop the plugin instance.
   */
  function stop() {
    debug('Plugin stopping')
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
