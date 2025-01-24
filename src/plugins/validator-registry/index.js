'use strict'

const logger = require('../../logger');
const {
  getValidators,
  registerValidator,
  deregisterValidator
} = require('./api')
const { ValidatorRegistry, Lumerin, CloneFactory } = require('contracts-js')

function createPlugin() {

  function start({ config, plugins }) {
    const {
      lmrTokenAddress,
      cloneFactoryAddress,
      validatorRegistryAddress
    } = config
    const { eth } = plugins

    const web3 = eth.web3

    const lumerin = Lumerin(web3, lmrTokenAddress)
    const cloneFactory = CloneFactory(web3, cloneFactoryAddress)

    const registry = ValidatorRegistry(web3, validatorRegistryAddress)

    return {
      api: {
        getValidators: getValidators(registry),
        registerValidator: registerValidator(registry, web3, lumerin, cloneFactory),
        deregisterValidator: deregisterValidator(registry)
      },
      events: [
      ],
      name: 'validator-registry',
    }
  }

  function stop() {
    logger.debug('Plugin stopping')
  }

  return {
    start,
    stop,
  }
}

module.exports = createPlugin
