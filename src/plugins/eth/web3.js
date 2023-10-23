'use strict'

const { Web3Http } = require('./web3Http');


function createWeb3(config) {
  // debug.enabled = config.debug
  const web3 = new Web3Http(config.httpApiUrls)
  return web3
}

function destroyWeb3(web3) {
  web3.currentProvider?.disconnect()
}

module.exports = {
  createWeb3,
  destroyWeb3,
}
