const Web3 = require('web3')
const https = require('https')
const logger = require('../../logger')

class Web3Http extends Web3 {
  constructor(providers, options) {
    super()

    this.providers = providers.map(
      (provider) =>
        new Web3.providers.HttpProvider(provider, {
          agent: new https.Agent({
            rejectUnauthorized: false, // Set to false if your HTTPS node endpoint uses a self-signed certificate
          }),
        })
    )
    this.currentIndex = 0

    // Initialize Web3 with the first provider from the list
    this.setCustomProvider(this.providers[this.currentIndex])

    // Set options if provided
    if (options) {
      this.setProviderOptions(options)
    }
  }

  setCustomProvider(provider) {
    // Override the setProvider method to handle switching providers on failure
    this.setProvider(provider)

    // Hook into provider's request and response handling
    const originalSend = this.currentProvider.send.bind(this.currentProvider)
    this.currentProvider.send = (payload, callback) => {
      originalSend(payload, (error, response) => {
        if (error) {
          // If the request fails, switch to the next provider and try again
          this.currentIndex = (this.currentIndex + 1) % this.providers.length
          this.setCustomProvider(this.providers[this.currentIndex])
          logger.error(
            `Switched to provider: ${this.providers[this.currentIndex].host}`
          )
          this.currentProvider.send(payload, callback) // Retry the request
        } else {
          callback(null, response)
        }
      })
    }
    return true
  }

  setProviderOptions(options) {
    this.currentProvider.host = options.host || this.currentProvider.host
    this.currentProvider.timeout =
      options.timeout || this.currentProvider.timeout
  }
}

module.exports = { Web3Http };
