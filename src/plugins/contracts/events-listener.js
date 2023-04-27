//@ts-check
const debug = require('debug')('lmr-wallet:core:contracts:event-listener')

class ContractEventsListener {
  /**
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   */
  constructor(cloneFactory) {
    this.cloneFactory = cloneFactory
    this.cloneFactoryListener = null
    this.contracts = {}
  }

  /**
   * @param {(contractId?: string) => void} onUpdate
   */
  setOnUpdate(onUpdate) {
    this.onUpdate = onUpdate
  }

  /**
   *
   * @param {string} id
   * @param {import('contracts-js').ImplementationContext} instance
   */
  addContract(id, instance) {
    if (!this.contracts[id]) {
      this.contracts[id] = instance.events.allEvents()
      this.contracts[id]
        .on('connected', () => {
          debug(`Start listen contract (${id}) events`)
        })
        .on('data', () => {
          debug(`Contract (${id}) updated`)
          if (this.onUpdate){
            this.onUpdate(id)
          }
        })
    }
  }

  listenCloneFactory() {
    if (!this.cloneFactoryListener) {
      this.cloneFactoryListener = this.cloneFactory.events.contractCreated()
      this.cloneFactoryListener
        .on('connected', () => {
          debug('Start listen clone factory events')
        })
        .on('data', (event) => {
          const contractId = event.returnValues._address
          debug('New contract created', contractId)
          this.onUpdate(contractId)
        })
    }
  }

  /**
   * @static
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   * @param {boolean} [debugEnabled=false]
   * @returns {ContractEventsListener}
   */
  static create(cloneFactory, debugEnabled = false) {
    if (ContractEventsListener.instance) {
      return ContractEventsListener.instance
    }
    debug.enabled = debugEnabled;

    const instance = new ContractEventsListener(cloneFactory)
    ContractEventsListener.instance = instance
    instance.listenCloneFactory()
    return instance
  }

  /**
   * @returns {ContractEventsListener}
   */
  static getInstance() {
    if (!ContractEventsListener.instance) {
      throw new Error("ContractEventsListener instance not created")
    }
    return ContractEventsListener.instance
  }

  /**
   * @static
   * @param {(contractId?: string) => void} onUpdate
  */
  static setOnUpdate(onUpdate) {    
    ContractEventsListener.getInstance().onUpdate = onUpdate
  }
}

module.exports = { ContractEventsListener }
