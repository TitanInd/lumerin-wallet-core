const Web3 = require('web3')
const https = require('https')
const logger = require('../../logger')

const isRateLimitError = (response) => {
  const { result, ...data } = response
  const code = response.error?.code
  if (code === 429 || code === -32029 || code === -32097) {
    return true
  }

  const message = response.error?.message?.toLowerCase()
  if (!message) {
    return false
  }
  return (
    message.includes('too many requests') ||
    message.includes('rate limit exceeded') ||
    message.includes('reached maximum qps limit') ||
    message.includes('rate limit reached') || 
    message.includes("we can't execute this request") ||
    message.includes("max message response size exceed") || 
    message.includes("upgrade your plan")
  );
}

const timeouts = {
  0: 500,
  1: 750,
  2: 1000,
  3: 1500,
  4: 2000,
  5: 2000,
}

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
    this.retryCount = 0

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
      originalSend(payload, async (error, response) => {
        if (error || isRateLimitError(response)) {
          // Avoid infinite loop
          if (this.retryCount >= this.providers.length * 2) {
            callback(error, response)
            this.retryCount = 0
            return
          }
          // If the request fails, switch to the next provider and try again
          this.currentIndex = (this.currentIndex + 1) % this.providers.length
          this.setCustomProvider(this.providers[this.currentIndex])
          logger.error(error || JSON.stringify(response.error));
          this.retryCount += 1
          const timeout = timeouts[this.retryCount] || 1000;
          logger.error(
            `Switched to provider: ${this.providers[this.currentIndex].host}, timeout: ${timeout}`
          )
          await new Promise((resolve) => setTimeout(resolve, timeout))

          this.currentProvider.send(payload, callback)
        } else {
          this.retryCount = 0
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

module.exports = { Web3Http }
