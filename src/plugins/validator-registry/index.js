// @ts-check
const logger = require('../../logger');
const api = require('./api')
const { ValidatorRegistry, Lumerin } = require('contracts-js')

function createPlugin() {

  function start({ config, plugins }) {
    const {
      lmrTokenAddress,
      validatorRegistryAddress
    } = config
    const { eth } = plugins

    const web3 = eth.web3

    const lumerin = Lumerin(web3, lmrTokenAddress)
    const registry = ValidatorRegistry(web3, validatorRegistryAddress)

    return {
      api: {
        getValidator: api.getValidator(registry),
        getValidators: api.getValidators(registry, web3),
        registerValidator: api.registerValidator(registry, web3, lumerin),
        deregisterValidator: api.deregisterValidator(registry, web3),
        getValidatorsMinimalStake: api.getValidatorsMinimalStake(registry),
        getValidatorsRegisterStake: api.getValidatorsRegisterStake(registry)
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
