//@ts-check
const logger = require('../../logger');
const { Lumerin, CloneFactory } = require('contracts-js')
const {
  createContract,
  cancelContract,
  purchaseContract,
  setContractDeleteStatus,
  editContract,
  getMarketplaceFee
} = require('./api')
const { EventsController } = require('./events-controller');
const { WatcherPolling } = require('./watcher-polling');

/**
 * Create a plugin instance.
 * @returns {({ start: Function, stop: () => void})} The plugin instance.
 */
function createPlugin() {
  /**
   * Start the plugin instance.
   * @param {object} options Start options.
   * @returns {{ api: {[key: string]:any}, events: string[], name: string }} The instance details.
   */
  function start({ config, eventBus, plugins }) {
    const { lmrTokenAddress, cloneFactoryAddress } = config

    /** @type {import('web3').default} */
    const web3 = plugins.eth.web3

    const lumerin = Lumerin(web3, lmrTokenAddress)
    const cloneFactory = CloneFactory(web3, cloneFactoryAddress)

    const watcher = new WatcherPolling(web3, config.walletAddress, cloneFactoryAddress, 3000)
    const eventsController = new EventsController(
      web3, eventBus, watcher, config.walletAddress, cloneFactory
    )

    return {
      api: {
        startWatching: eventsController.start.bind(eventsController),
        stopWatching: eventsController.stop.bind(eventsController),
        refreshContracts: eventsController.refreshContracts.bind(eventsController),
        createContract: createContract(web3, cloneFactory),
        cancelContract: cancelContract(web3, cloneFactory),
        purchaseContract: purchaseContract(web3, cloneFactory, lumerin),
        editContract: editContract(web3, cloneFactory),
        getMarketplaceFee: getMarketplaceFee(cloneFactory),
        setContractDeleteStatus: setContractDeleteStatus(
          web3,
          cloneFactory,
          eventsController.updateContract.bind(eventsController),
        ),
      },
      events: [
        'contracts-scan-started',
        'contracts-scan-finished', // also on update of single contract
        'contracts-updated',
        'wallet-error',
      ],
      name: 'contracts',
    }
  }

  /**
   * Stop the plugin instance.
   */
  function stop() {
    logger.debug('Plugin stopping')
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
