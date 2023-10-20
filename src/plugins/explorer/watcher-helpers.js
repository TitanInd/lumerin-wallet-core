/**
 * @type {typeof import('web3-eth-abi').default}
 */
//@ts-ignore
const abi = require('web3-eth-abi');

/**
 * @typedef {Object} EventData
 * @property {string} data
 * @property {string[]} topics
 */

/**
 * 
 * @param {AbiItemSignature[]} contractAbi 
 * @param {string} signature 
 * @returns {AbiItemSignature | null}
 */
function decodeAbiSignature(contractAbi, signature) {
  return contractAbi.find((e) => e.signature === signature)
}
/**
 * 
 * @param {AbiItemSignature[]} contractAbi 
 * @param {EventData} eventData 
 * @returns {{eventName: string, [key: string]: string}}
 */
function decodeEvent(contractAbi, eventData) {
  const [eventSignature, ...restTopics] = eventData.topics
  const eventAbi = decodeAbiSignature(contractAbi, eventSignature)
  if (!eventAbi) {
    throw new Error(`Event ${eventSignature} not found`)
  }
  try {
    const data = abi.decodeLog(eventAbi.inputs, eventData.data, restTopics)
    return {
      eventName: eventAbi.name,
      ...data
    }
  } catch (err) {
    throw new Error(`Event ${eventAbi.name} decode error: ${err}`)
  }
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function jsonrpcid() {
  return Math.floor(Math.random() * 1000000000)
}

module.exports = {
  decodeEvent,
  decodeAbiSignature,
  sleep,
  jsonrpcid,
}