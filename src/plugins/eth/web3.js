'use strict'

const debug = require('debug')('lmr-wallet:core:eth:web3')
const Web3 = require('web3')
const https = require('https')

function createWeb3(config) {
  debug.enabled = config.debug

  const web3 = new Web3(providers[0], {
    agent: new https.Agent({
      rejectUnauthorized: false, // Set to false if your HTTPS node endpoint uses a self-signed certificate
    }),
  })

  overrideFunctions(web3)
  overrideFunctions(web3.eth)
  web3.subscriptionProvider = subscriptionProvider

  return web3
}

function createWeb3Subscribable(config, eventBus) {
  debug.enabled = config.debug

  const options = {
    timeout: 1000 * 15, // ms
    // Enable auto reconnection
    reconnect: {
      auto: true,
      delay: 5000, // ms
      maxAttempts: false,
      onTimeout: false,
    },
  }

  const web3 = new Web3(
    new Web3.providers.WebsocketProvider(config.wsApiUrl, options)
  )

  web3.currentProvider.on('connect', function () {
    debug('Web3 provider connected')
    eventBus.emit('web3-connection-status-changed', { connected: true })
  })
  web3.currentProvider.on('error', function (event) {
    debug('Web3 provider connection error: ', event.type || event.message)
    eventBus.emit('web3-connection-status-changed', { connected: false })
  })
  web3.currentProvider.on('end', function (event) {
    debug('Web3 provider connection ended: ', event.reason)
    eventBus.emit('web3-connection-status-changed', { connected: false })
  })

  return web3
}

function destroyWeb3(web3) {
  web3.currentProvider.disconnect()
}

const urls = [
  process.env.HTTP_ETH_NODE_ADDRESS,
  process.env.HTTP_ETH_NODE_ADDRESS2,
  process.env.HTTP_ETH_NODE_ADDRESS3,
]

const providers = urls.map((url) => {
  return new Web3.providers.HttpProvider(url, {
    agent: new https.Agent({
      rejectUnauthorized: false, // Set to false if your HTTPS node endpoint uses a self-signed certificate
    }),
  })
})
let lastUsedProviderIndex = -1

const overrideFunctions = function (object) {
  const originalSetProvider = object.setProvider

  const originalFunctions = Object.assign({}, object)
  Object.keys(originalFunctions).forEach((key) => {
    if (
      typeof originalFunctions[key] === 'function' &&
      !key.startsWith('set')
    ) {
      object[key] = function () {
        const isAsync =
          originalFunctions[key][Symbol.toStringTag] === 'AsyncFunction'
        const args = arguments
        let providerIndex = lastUsedProviderIndex
        let result
        do {
          providerIndex = (providerIndex + 1) % providers.length
          const provider = providers[providerIndex]
          originalSetProvider(provider)
          if (isAsync) {
            result = originalFunctions[key]
              .apply(this, args)
              .then((res) => {
                if (res !== undefined) {
                  return res
                }
                throw new Error('Result is undefined')
              })
              .catch((error) => {
                console.error(`Error with provider ${provider.host}:`, error)
                throw error
              })
          } else {
            try {
              result = originalFunctions[key].apply(this, args)
              if (result !== undefined) {
                break
              }
            } catch (error) {
              console.error(`Error with provider ${provider.host}:`, error)
            }
          }
        } while (providerIndex !== lastUsedProviderIndex)
        lastUsedProviderIndex = providerIndex
        if (result === undefined) {
          throw new Error('All providers failed to execute the function')
        }
        return result
      }
    }
  })

  object.setProvider = originalSetProvider
}

let subscriptionProvider

module.exports = {
  createWeb3,
  destroyWeb3,
  createWeb3Subscribable,
}
