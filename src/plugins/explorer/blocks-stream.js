'use strict';

const logger = require('../../logger');

function createStream (web3) {
  const subscription = web3.eth.subscribe('newBlockHeaders');

  web3.eth.getBlock('latest')
    .then(function (block) {
      subscription.emit('data', block);
    })
    .catch(function (err) {
      subscription.emit('error', err);
    })

  // subscription.destroy = subscription.unsubscribe;
  subscription.unsubscribe(function(error, success) {
    success || logger.error('Could not successfully unsubscribe from web3 block-stream');
  });

  return subscription;
}

module.exports = createStream;
