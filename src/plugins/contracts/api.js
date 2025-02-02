// const debug = require('debug')('lmr-wallet:core:contracts:api')
const logger = require('../../logger')
const { encrypt } = require('ecies-geth')
const { Implementation } = require('contracts-js')
const { remove0xPrefix, add65BytesPrefix } = require('./helpers')
const { decompressPublicKey } = require('../validator-registry/api')
const ethereumWallet = require('ethereumjs-wallet').default

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

/**
 * @param {import('web3').default} web3
 * @param {string} implementationAddress
 * @param {string} [walletAddress]
 */
async function _loadContractInstance(
  web3,
  implementationAddress,
  walletAddress
) {
  try {
    const implementationContract = Implementation(web3, implementationAddress)
    const contract = await implementationContract.methods
      .getPublicVariablesV2()
      .call()
    const stats = await implementationContract.methods.getStats().call()

    const history = await implementationContract.methods
      .getHistory('0', '100')
      .call()
    const buyerHistory = history
      .filter((h) => {
        return h[6] === walletAddress
      })
      .map((h) => ({
        ...h,
        id: implementationAddress,
      }))

    const { _successCount: successCount, _failCount: failCount } = stats

    const {
      _state: state,
      _terms: {
        _price: price, // cost to purchase the contract
        _limit: limit, // max th provided
        _speed: speed, // th/s of contract
        _length: length, // duration of the contract in seconds
        _version: version,
        _profitTarget: profitTarget
      },
      _startingBlockTimestamp: timestamp, // timestamp of the block at moment of purchase
      _buyer: buyer, // wallet address of the purchasing party
      _seller: seller, // wallet address of the selling party
      _encryptedPoolData: encryptedPoolData, // encrypted data for pool target info,
      _isDeleted: isDead, // check if contract is dead
      _balance: balance,
      _hasFutureTerms: hasFutureTerms,
    } = contract

    let futureTerms = null
    if (walletAddress && hasFutureTerms && seller === walletAddress) {
      const data = await implementationContract.methods.futureTerms().call()
      futureTerms = {
        price: data._price,
        speed: data._speed,
        length: data._length,
        limit: data._limit,
        version: data._version,
        profitTarget: data._profitTarget
      }
    }

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
        isDead,
        balance,
        stats: {
          successCount,
          failCount,
        },
        hasFutureTerms,
        futureTerms,
        history: buyerHistory,
        version,
        profitTarget
      },
    }
  } catch (err) {
    logger.error(err)
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
  return await cloneFactory.methods.marketplaceFee().call()
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
      profit = 0,
      validatorAddress = '0x0000000000000000000000000000000000000000',
      privateKey,
    } = params

    const tempWallet = ethereumWallet.fromPrivateKey(
      Buffer.from(remove0xPrefix(privateKey), 'hex')
    )
    const pubKey = tempWallet.getPublicKey()

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)
    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call()

    const gas = await cloneFactory.methods
      .setCreateNewRentalContractV2(
        price,
        limit,
        speed,
        duration,
        +profit,
        validatorAddress,
        pubKey.toString('hex')
      )
      .estimateGas({
        from: sellerAddress,
        value: marketplaceFee,
      })

    return cloneFactory.methods
      .setCreateNewRentalContractV2(
        price,
        limit,
        speed,
        duration,
        +profit,
        validatorAddress,
        pubKey.toString('hex')
      )
      .send({ from: sellerAddress, gas, value: marketplaceFee })
  }
}

/**
 * @param {import('web3').default} web3
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

    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call()

    const gas = await Implementation(web3, contractId)
      .methods.setContractCloseOut(closeOutType)
      .estimateGas({
        from: walletAddress,
        value: marketplaceFee,
      })

    return await Implementation(web3, contractId)
      .methods.setContractCloseOut(closeOutType)
      .send({
        from: walletAddress,
        gas,
        value: marketplaceFee,
      })
  }
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
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

    const {
      data: { isDead },
    } = await _loadContractInstance(web3, contractId)
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
    return result
  }
}


/**
 *
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 * @param {import('contracts-js').LumerinContext} lumerin
 * @returns {(p: {validatorUrl: string, validatorAddr: string, destUrl: string, validatorPubKeyYparity: boolean, validatorPubKeyX: `0x${string}`, contractAddr: string, price: string,version: number, privateKey: string}) => Promise<void>}
 */
function purchaseContract(web3, cloneFactory, lumerin) {
  return async (params) => {
    const { validatorUrl, destUrl, validatorAddr, validatorPubKeyYparity, validatorPubKeyX, privateKey, contractAddr, price, version } = params;


    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const implementationContract = Implementation(web3, contractAddr)
    const sellerPubKey = await implementationContract.methods.pubKey().call()

    const isThirdPartyValidator = validatorAddr !== ZERO_ADDRESS;
    const encrDestPubKey = isThirdPartyValidator ? decompressPublicKey(validatorPubKeyYparity, validatorPubKeyX) : sellerPubKey;

    const encrValidatorUrl = await encrypt(
      Buffer.from(add65BytesPrefix(sellerPubKey), 'hex'),
      Buffer.from(validatorUrl)
    ).then(res => res.toString('hex'))

    const encrDestUrl = await encrypt(
      Buffer.from(add65BytesPrefix(encrDestPubKey), 'hex'),
      Buffer.from(destUrl)
    ).then(res => res.toString('hex'))

    const increaseAllowanceEstimate = await lumerin.methods
      .increaseAllowance(cloneFactory.options.address, price)
      .estimateGas({
        from: account.address,
      })

    await lumerin.methods
      .increaseAllowance(cloneFactory.options.address, price)
      .send({
        from: account.address,
        gas: increaseAllowanceEstimate,
      })

    const marketplaceFee = await cloneFactory.methods.marketplaceFee().call()

    const purchaseGas = await cloneFactory.methods
      .setPurchaseRentalContractV2(
        contractAddr,
        validatorAddr,
        encrValidatorUrl,
        encrDestUrl,
        version
      )
      .estimateGas({
        from: account.address,
        value: marketplaceFee,
      })

    const purchaseResult = await cloneFactory.methods
      .setPurchaseRentalContractV2(
        contractAddr,
        validatorAddr,
        encrValidatorUrl,
        encrDestUrl,
        version
      )
      .send({
        from: account.address,
        gas: purchaseGas,
        value: marketplaceFee,
      })

    logger.debug('Finished puchase transaction', purchaseResult)
  }
}

/**
 *
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 * @param {import('contracts-js').LumerinContext} lumerin
 * @returns
 */
function editContract(web3, cloneFactory, lumerin) {
  return async (params) => {
    const {
      walletId,
      contractId,
      privateKey,
      price,
      limit = 0,
      speed,
      duration,
      profit = 0
    } = params
    const sendOptions = { from: walletId }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const editGas = await cloneFactory.methods
      .setUpdateContractInformationV2(contractId, price, limit, speed, duration, +profit)
      .estimateGas({
        from: sendOptions.from,
      });

    const editResult = await cloneFactory.methods
      .setUpdateContractInformationV2(contractId, price, limit, speed, duration, +profit)
      .send({
        ...sendOptions,
        gas: editGas,
      })

    logger.debug('Finished edit contract transaction', editResult)
  }
}

module.exports = {
  createContract,
  cancelContract,
  purchaseContract,
  setContractDeleteStatus,
  editContract,
  getMarketplaceFee,
}
