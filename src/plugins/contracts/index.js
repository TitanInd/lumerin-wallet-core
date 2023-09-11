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
  setContractDeleteStatus,
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
    const web3Subscriptionable = new Web3(plugins.eth.web3SubscriptionProvider)

    const lumerin = Lumerin(web3, lmrTokenAddress)
    const cloneFactory = CloneFactory(web3, cloneFactoryAddress)
    const cloneFactorySubscriptionable = CloneFactory(
      web3Subscriptionable,
      cloneFactoryAddress
    )

    const marketplaceFee = cloneFactory.methods.marketplaceFee().call();

    const refreshContracts =
      (web3, lumerin, cloneFactory) => async (contractId) => {
        eventBus.emit('contracts-scan-started', {})

        const addresses = contractId
          ? [contractId]
          : await cloneFactory.methods
              .getContractList()
              .call()
              .catch((error) => {
                debug('cannot get list of contract addresses:', error)
                throw error
              })

        return getContracts(
          web3,
          web3Subscriptionable,
          lumerin,
          cloneFactory,
          addresses
        )
          .then((contracts) => {
            eventBus.emit('contracts-scan-finished', {
              actives: contracts,
            })
          })
        .catch(function (error) {
          debug('Could not sync contracts/events', error.stack)
          throw error
        })
    }

    const contractEventsListener = ContractEventsListener.create(
      cloneFactorySubscriptionable,
      config.debug
    )

    const onUpdate = refreshContracts(web3, lumerin, cloneFactory)
    contractEventsListener.setOnUpdate(onUpdate)

    return {
      api: {
        refreshContracts: refreshContracts(web3, lumerin, cloneFactory),
        createContract: createContract(web3, cloneFactory, marketplaceFee),
        cancelContract: cancelContract(web3, marketplaceFee),
        purchaseContract: purchaseContract(web3, cloneFactory, lumerin, marketplaceFee),
        setContractDeleteStatus: setContractDeleteStatus(
          web3,
          cloneFactory,
          onUpdate,
        ),
      },
      events: [
        'contracts-scan-started',
        'contracts-scan-finished',
        'contract-updated',
      ],
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
