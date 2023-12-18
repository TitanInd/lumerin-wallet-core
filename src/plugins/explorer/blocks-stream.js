'use strict';

const EventEmitter = require('events');

function createStream(web3, updateInterval = 10000) {
  const stream = new EventEmitter();

  const getBlockFunc = async () => {
    try {
      const block = await web3.eth.getBlock('latest');
      stream.emit('data', block);
    } catch (err) {
      stream.emit('error', err);
    }
  }

  getBlockFunc()
  const interval = setInterval(getBlockFunc, updateInterval);

  const stop = () => {
    stream.removeAllListeners()
    if (interval) {
      clearInterval(interval)
    }
  }

  return { stream, stop };
}

module.exports = createStream;
