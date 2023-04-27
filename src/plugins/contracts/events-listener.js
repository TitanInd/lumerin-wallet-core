//@ts-check
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
      debug('Start listen clone factory events')
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

  /**
   * @static
   * @param {import('contracts-js').CloneFactoryContext} cloneFactory
   * @param {boolean} [debugEnabled=false]
   */
  static create(cloneFactory, debugEnabled = false) {
    if (ContractEventsListener.instance) {
      return ContractEventsListener.instance
    }
    debug.enabled = debugEnabled;
    ContractEventsListener.instance = new ContractEventsListener(
      cloneFactory
    )
    return ContractEventsListener.instance
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
