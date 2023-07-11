const debug = require('debug')('lmr-wallet:core:contracts:api')
const { encrypt } = require('ecies-geth')
const { Implementation } = require('contracts-js')
const { remove0xPrefix, add65BytesPrefix } = require('./helpers')
const { ContractEventsListener } = require('./events-listener')
const ethereumWallet = require('ethereumjs-wallet').default

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
    const stats = await implementationContract.methods.getStats().call()

    const { _successCount: successCount, _failCount: failCount } = stats

    const {
      _state: state,
      _price: price, // cost to purchase the contract
      _limit: limit, // max th provided
      _speed: speed, // th/s of contract
      _length: length, // duration of the contract in seconds
      _startingBlockTimestamp: timestamp, // timestamp of the block at moment of purchase
      _buyer: buyer, // wallet address of the purchasing party
      _seller: seller, // wallet address of the selling party
      _encryptedPoolData: encryptedPoolData, // encrypted data for pool target info,
      _isDeleted: isDead, // check if contract is dead
      _balance: balance,
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
        isDead,
        balance,
        stats: {
          successCount,
          failCount,
        },
      },
    }
  } catch (err) {
    debug(
      'Error when trying to load Contracts by address in the Implementation contract: ',
      err
    )
    throw err
  }
}

/**
 * @param {import('web3').default} web3
 * @param {import('web3').default} web3Subscriptionable
 * @param {import('contracts-js').LumerinContext} lumerin
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 * @param {string[]} addresses
 */
async function getContracts(
  web3,
  web3Subscriptionable,
  lumerin,
  cloneFactory,
  addresses
) {
  return Promise.all(
    addresses.map(async (address) =>
      getContract(web3, web3Subscriptionable, lumerin, cloneFactory, address)
    )
  )
}

/**
 * @param {import('web3').default} web3
 * @param {import('web3').default} web3Subscriptionable
 * @param {import('contracts-js').LumerinContext} lumerin
 * @param {string} contractId
 */
async function getContract(
  web3,
  web3Subscriptionable,
  lumerin,
  cloneFactory,
  contractId
) {
  const contractEventsListener = ContractEventsListener.getInstance()
  const contractInfo = await _loadContractInstance(web3, contractId)

  contractEventsListener.addContract(
    contractInfo.data.id,
    Implementation(web3Subscriptionable, contractId)
  )
  return contractInfo.data
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

    return cloneFactory.methods
      .setCreateNewRentalContract(
        price,
        limit,
        speed,
        duration,
        validatorAddress,
        pubKey.toString('hex')
      )
      .send({ from: sellerAddress, gas: 500000 })
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

    return await Implementation(web3, contractId)
      .methods.setContractCloseOut(closeOutType)
      .send({
        from: walletAddress,
        gas: gasLimit,
      })
  }
}

/**
 * @param {import('web3').default} web3
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
function setContractDeleteStatus(web3, cloneFactory, onUpdate) {
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

    const result = await cloneFactory.methods
      .setContractDeleted(contractId, deleteContract)
      .send({
        from: walletAddress,
        gas: gasLimit,
      })
    onUpdate(contractId).catch((err) =>
      debug(`Failed to refresh after setContractDeadStatus: ${err}`)
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
    const { walletId, contractId, url, privateKey, price } = params
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

    const { isDead } = await _loadContractInstance(web3, contractId)
    if (isDead) {
      throw new Error('Contract is deleted already')
    }

    await lumerin.methods
      .increaseAllowance(cloneFactory.options.address, price + price * 0.01)
      .send(sendOptions)

    const purchaseResult = await cloneFactory.methods
      .setPurchaseRentalContract(contractId, ciphertext.toString('hex'))
      .send(sendOptions)

    debug('Finished puchase transaction', purchaseResult)
  }
}

module.exports = {
  getContracts,
  getContract,
  createContract,
  cancelContract,
  purchaseContract,
  setContractDeleteStatus,
}
