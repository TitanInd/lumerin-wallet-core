'use strict'

const debug = require('debug')('lmr-wallet:core:eth:web3')
const Web3 = require('web3')
const https = require('https')

function createWeb3(config) {
  debug.enabled = config.debug
  
  const web3 = new Web3(new Web3.providers.HttpProvider(
    config.httpApiUrl,
    {
      agent: new https.Agent({
        rejectUnauthorized: false, // Set to false if your HTTPS node endpoint uses a self-signed certificate
      }),
    }
  ));
  
  return web3
}

function createWeb3Subscriptionable (config, eventBus) {
  debug.enabled = config.debug;

  const web3 = new Web3(new Web3.providers.WebsocketProvider(
    config.wsApiUrl,
    { autoReconnect: true, timeout: config.web3Timeout }
  ));

  web3.currentProvider.on('connect', function () {
    debug('Web3 provider connected');
    eventBus.emit('web3-connection-status-changed', { connected: true });
  });
  web3.currentProvider.on('error', function (event) {
    debug('Web3 provider connection error: ', event.type || event.message);
    eventBus.emit('web3-connection-status-changed', { connected: false });
  });
  web3.currentProvider.on('end', function (event) {
    debug('Web3 provider connection ended: ', event.reason);
    eventBus.emit('web3-connection-status-changed', { connected: false });
  });

  return web3;
}

function destroyWeb3(web3) {
  web3.currentProvider.disconnect()
}

module.exports = {
  createWeb3,
  destroyWeb3,
  createWeb3Subscriptionable,
}
