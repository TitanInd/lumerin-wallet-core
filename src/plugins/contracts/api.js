// const debug = require('debug')('lmr-wallet:core:contracts:api')
const logger = require('../../logger')
const { encrypt } = require('ecies-geth')
const { Implementation } = require('contracts-js')
const { remove0xPrefix, add65BytesPrefix } = require('./helpers')
const ethereumWallet = require('ethereumjs-wallet').default

/**
 * @param {import('web3').default} web3
 * @param {string} contractId
 * @param {string} walletAddress
 * @returns {Promise<Contract>}
 */
async function getContract(
  web3,
  contractId,
  walletAddress
) {
  try {
    const implementation = Implementation(web3, contractId)
    const contract = await implementation.methods
      .getPublicVariables()
      .call()
    const stats = await implementation.methods.getStats().call()

    let futureTerms = null
    if (walletAddress && contract._hasFutureTerms && contract._seller === walletAddress) {
      const data = await implementation.methods.futureTerms().call()
      futureTerms = {
        price: data._price,
        speed: data._speed,
        length: data._length,
        limit: data._limit,
        version: data._version,
      }
    }

    return {
      id: contractId,
      price: contract._price,
      speed: contract._speed,
      length: contract._length,
      buyer: contract._buyer,
      seller: contract._seller,
      timestamp: contract._startingBlockTimestamp,
      state: contract._state,
      encryptedPoolData: contract._encryptedPoolData,
      limit: contract._limit,
      isDead: contract._isDeleted,
      balance: contract._balance,
      hasFutureTerms: contract._hasFutureTerms,
      version: contract._version,
      stats: {
        successCount: stats._successCount,
        failCount: stats._failCount,
      },
      futureTerms,
    }
  } catch (err) {
    logger.error(
      'Error when trying to load Contracts by address in the Implementation contract: ',
      err
    )
    throw err
  }
}

/**
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
const getMarketplaceFee = (cloneFactory) => async () => {
  return await cloneFactory.methods.marketplaceFee().call();
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
function createContract(web3, cloneFactory) {
  if (!web3) {
    logger.error('Not a valid Web3 instance')
    return
  }

  return async function (params) {
    let {
      price,
      limit = 0,
      speed,
      duration,
      sellerAddress,
      validatorAddress = '0x0000000000000000000000000000000000000000',
      privateKey,
    } = params

    const isWhitelisted = await cloneFactory.methods
      .checkWhitelist(sellerAddress)
      .call()
    if (!isWhitelisted) {
      throw new Error('seller is not whitelisted')
    }

    const tempWallet = ethereumWallet.fromPrivateKey(
      Buffer.from(remove0xPrefix(privateKey), 'hex')
    )
    const pubKey = tempWallet.getPublicKey()

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)
    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call();

    const gas = await cloneFactory.methods
      .setCreateNewRentalContract(
        price,
        limit,
        speed,
        duration,
        validatorAddress,
        pubKey.toString('hex')
      )
      .estimateGas({
        from: sellerAddress,
        value: marketplaceFee
      })

    return cloneFactory.methods
      .setCreateNewRentalContract(
        price,
        limit,
        speed,
        duration,
        validatorAddress,
        pubKey.toString('hex')
      )
      .send({ from: sellerAddress, gas, value: marketplaceFee })
  }
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
function cancelContract(web3, cloneFactory) {
  if (!web3) {
    logger.error('Not a valid Web3 instance')
    return
  }

  return async function (params) {
    const {
      walletAddress,
      contractId,
      privateKey,
      closeOutType,
    } = params

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call();

    const gas = await cloneFactory.methods
      .setContractCloseout(contractId, closeOutType)
      .estimateGas({
        from: walletAddress,
        value: marketplaceFee
      })

    return await cloneFactory.methods
      .setContractCloseout(contractId, closeOutType)
      .send({
        from: walletAddress,
        gas,
        value: marketplaceFee
      })
  }
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 * @param {(contractId: string)=>Promise<void>} onUpdate 
 */
function setContractDeleteStatus(web3, cloneFactory, onUpdate) {
  if (!web3) {
    logger.error('Not a valid Web3 instance')
    return
  }

  return async function (params) {
    const {
      walletAddress,
      contractId,
      privateKey,
      deleteContract,
    } = params

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const isDead = await Implementation(web3, contractId).methods.isDeleted().call()
    if (Boolean(isDead) === Boolean(deleteContract)) {
      return true
    }

    const gas = await cloneFactory.methods
      .setContractDeleted(contractId, deleteContract)
      .estimateGas({
        from: walletAddress,
      })

    const result = await cloneFactory.methods
      .setContractDeleted(contractId, deleteContract)
      .send({
        from: walletAddress,
        gas,
      })
    onUpdate(contractId).catch((err) =>
      logger.error(`Failed to refresh after setContractDeadStatus: ${err}`)
    )
    return result
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
    const { walletId, contractId, url, privateKey, price, version } = params
    const sendOptions = { from: walletId, gas: 1_000_000 }

    //getting pubkey from contract to be purchased
    const implementationContract = Implementation(web3, contractId)

    const pubKey = await implementationContract.methods.pubKey().call()

    //encrypting plaintext url parameter
    const ciphertext = await encrypt(
      Buffer.from(add65BytesPrefix(pubKey), 'hex'),
      Buffer.from(url)
    )

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const isDead = await Implementation(web3, contractId).methods.isDeleted().call()
    if (isDead) {
      throw new Error('Contract is deleted already')
    }

    await lumerin.methods
      .increaseAllowance(cloneFactory.options.address, price)
      .send(sendOptions)

    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call();

    const purchaseGas = await cloneFactory.methods
      .setPurchaseRentalContract(contractId, ciphertext.toString('hex'), version)
      .estimateGas({
        from: sendOptions.from,
        value: marketplaceFee
      })

    const purchaseResult = await cloneFactory.methods
      .setPurchaseRentalContract(contractId, ciphertext.toString('hex'), version)
      .send({
        ...sendOptions,
        gas: purchaseGas,
        value: marketplaceFee
      })

    logger.debug('Finished puchase transaction', purchaseResult)
  }
}

/**
 *
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 * @returns {(params: Object)=>Promise<void>}
 */
function editContract(web3, cloneFactory) {
  return async (params) => {
    const {
      walletId,
      contractId,
      privateKey,
      price,
      limit = 0,
      speed,
      duration,
    } = params

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call();

    const editGas = await cloneFactory.methods
      .setUpdateContractInformation(contractId, price, limit, speed, duration)
      .estimateGas({
        from: walletId,
        value: marketplaceFee,
      })

    const editResult = await cloneFactory.methods
      .setUpdateContractInformation(contractId, price, limit, speed, duration)
      .send({
        from: walletId,
        gas: editGas,
        value: marketplaceFee,
      })

    logger.debug('Finished edit contract transaction', editResult)
  }
}

module.exports = {
  getContract,
  createContract,
  cancelContract,
  purchaseContract,
  setContractDeleteStatus,
  editContract,
  getMarketplaceFee
}
