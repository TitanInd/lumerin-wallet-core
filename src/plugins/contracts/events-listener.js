const debug = require('debug')('lmr-wallet:core:contracts')

class ContractEventsListener {
  /**
   *
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   * @param {Function} onUpdate
   */
  constructor(cloneFactory, onUpdate) {
    this.cloneFactory = cloneFactory
    this.cloneFactoryListener = null
    this.onUpdate = onUpdate
    this.contracts = {}
  }

  listenCloneFactory() {
    if (!this.cloneFactoryListener) {
      this.cloneFactoryListener = this.cloneFactory.events.contractCreated()
      this.cloneFactoryListener
        .on('connected', () => {
          debug('Start listen clone factory events')
        })
        .on('data', () => {
          debug('New contract created')
          this.onUpdate()
        })
    }
  }

  /**
   *
   * @param {string} id
   * @param {import('contracts-js').ImplementationContext} instance
   */
  addContract(id, instance) {
    if (!this.contracts[id]) {
      debug('Start listen clone factory events')
      this.contracts[id] = instance.events.allEvents()
      this.contracts[id]
        .on('connected', () => {
          debug(`Start listen contract (${id}) events`)
        })
        .on('data', () => {
          debug(`Contract (${id}) updated`)
          this.onUpdate()
        })
    }
  }

  /**
   * @static
   * @param {import('contracts-js').CloneFactoryContext} [cloneFactory]
   * @param {Function} [onUpdate]
   */
  static create(cloneFactory, onUpdate, debugEnabled = false) {
    if (ContractEventsListener.instance) {
      return ContractEventsListener.instance
    }
    debug.enabled = debugEnabled;
    ContractEventsListener.instance = new ContractEventsListener(
      cloneFactory,
      onUpdate
    )
    return ContractEventsListener.instance
  }
}

module.exports = { ContractEventsListener }
