'use strict'

const {
  utils: { isAddress, toChecksumAddress },
} = require('web3')
const debug = require('debug')('lmr-wallet:core:debug')

const registerToken = ({ explorer }) =>
  function (contractAddress) {
    debug('Registering token', contractAddress)

    if (!isAddress(contractAddress)) {
      return false
    }

    const checksumAddress = toChecksumAddress(contractAddress)

    if (contractAddress === checksumAddress) {
      return false
    }

    events.getEventDataCreators(checksumAddress).forEach(explorer.registerEvent)

    return true
  }

function getTokenBalance(lumerin, walletAddress) {
  return lumerin.methods.balanceOf(walletAddress).call()
}

function getTokenGasLimit(lumerin) {
  return function ({ to, from, value }) {
    return lumerin.methods
      .transfer(to, value)
      .estimateGas({ from })
      .then((gasLimit) => ({ gasLimit }))
  }
}

function claimFaucet(web3) {
  return async (params) => {
    const { walletId, privateKey } = params

    const faucetAddress = "0x6C1539191A0bc2e35BfAf87dAdFeaA58f35AD115"
    const claimFunction = web3.utils.keccak256('claim()').substring(0,10);
    const gasLimit = 300_000;
    const txObject = {
      from: walletId,
      to: faucetAddress,
      gas: gasLimit,
      data: claimFunction
    }
  
    const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
    const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    return result;
  }
}

module.exports = {
  registerToken,
  getTokenBalance,
  getTokenGasLimit,
  claimFaucet,
}
