//@ts-check
'use strict'

const debug = require('debug')('lmr-wallet:core:contracts:api')
const { Implementation } = require('contracts-js')

/**
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
async function _getContractAddresses(cloneFactory) {
  return await cloneFactory.methods
    .getContractList()
    .call()
    .catch((error) => {
      debug(
        'Error when trying get list of contract addresses from CloneFactory contract: ',
        error
      )
    })
}

/**
 * @param {import('web3').default} web3
 * @param {string} implementationAddress
 */
async function _loadContractInstance(web3, implementationAddress) {
  try {
    const implementationContract = Implementation(web3, implementationAddress)
    const contract = await implementationContract.methods
      .getPublicVariables()
      .call()

    const {
      0: state,
      1: price, // cost to purchase the contract
      2: limit, // max th provided
      3: speed, // th/s of contract
      4: length, // duration of the contract in seconds
      5: timestamp, // timestamp of the block at moment of purchase
      6: buyer, // wallet address of the purchasing party
      7: seller, // wallet address of the selling party
      8: encryptedPoolData, // encrypted data for pool target info
    } = contract

    return {
      data: {
        id: implementationAddress,
        price,
        speed,
        length,
        buyer,
        seller,
        timestamp,
        state,
        encryptedPoolData,
        limit,
      },
      instance: implementationContract,
    }
  } catch (err) {
    debug(
      'Error when trying to load Contracts by address in the Implementation contract: ',
      err
    )
    throw err;
  }
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').LumerinContext} lumerin
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
async function getActiveContracts(web3, lumerin, cloneFactory) {
  if (!web3) {
    debug('Not a valid Web3 instance')
    return
  }
  const addresses = (await _getContractAddresses(cloneFactory)) || []

  return Promise.all(
    addresses.map(async (a) => {
      const contract = await _loadContractInstance(web3, a)
      const balance = await lumerin.methods.balanceOf(contract.data.id).call()
      return {
        ...contract.data,
        balance,
      }
    })
  )
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
function createContract(web3, cloneFactory, plugins) {
  if (!web3) {
    debug('Not a valid Web3 instance')
    return
  }

  return async function (params) {
    // const { gasPrice } = await plugins.wallet.getGasPrice()
    let {
      price,
      limit = 0,
      speed,
      duration,
      sellerAddress,
      validatorAddress = '0x0000000000000000000000000000000000000000',
      privateKey,
    } = params


    const isWhitelisted = await cloneFactory.methods.checkWhitelist(sellerAddress).call()
    if (!isWhitelisted){
      throw new Error('seller is not whitelisted')
    }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    return plugins.explorer.logTransaction(
      cloneFactory.methods
        .setCreateNewRentalContract(price, limit, speed, duration, validatorAddress, '')
        .send({ from: sellerAddress, gas: 500000 }),
      sellerAddress
    )
  }
}

/**
 * @param {import('web3').default} web3
 */
function cancelContract(web3) {
  if (!web3) {
    debug('Not a valid Web3 instance')
    return
  }

  return async function (params) {
    const {
      walletAddress,
      gasLimit = 1000000,
      contractId,
      privateKey,
      closeOutType,
    } = params

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const implementationContract = await _loadContractInstance(web3, contractId)

    return implementationContract.instance.methods
      .setContractCloseOut(closeOutType)
      .send({
        from: walletAddress,
        gas: gasLimit,
      })
  }
}

/**
 * 
 * @param {import('web3').default} web3 
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory 
 * @param {import('contracts-js').LumerinContext} lumerin 
 * @returns 
 */
function purchaseContract(web3, cloneFactory, lumerin) {
  return async (params) => {
    const { walletId, contractId, url, privateKey, price } = params
    const sendOptions = { from: walletId, gas: 1_000_000 }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    await lumerin.methods
      .increaseAllowance(cloneFactory.options.address, price)
      .send(sendOptions)

    const purchaseResult = await cloneFactory.methods
      .setPurchaseRentalContract(contractId, url)
      .send(sendOptions)

    debug('Finished puchase transaction', purchaseResult)
  }
}

module.exports = {
  getActiveContracts,
  createContract,
  cancelContract,
  purchaseContract,
}
