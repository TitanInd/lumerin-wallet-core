//@ts-check

const ethereumWallet = require('ethereumjs-wallet').default
const { remove0xPrefix, add65BytesPrefix } = require('../contracts/helpers')
const { secp256k1 } = require('@noble/curves/secp256k1');
const { hexToBytes, bytesToHex } = require('@noble/curves/abstract/utils');
const { keccak256 } = require('web3-utils');
/** @type {typeof import("@dopex-io/web3-multicall").default} */
const Multicall = require("@dopex-io/web3-multicall");

// Cross-chain multicall address
const MulticallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11"

/**
 * @typedef {Object} Validator
 * @property {string} stake
 * @property {string} addr
 * @property {string} pubKeyYparity
 * @property {string} lastComplainer
 * @property {string} complains
 * @property {string} host
 * @property {string} pubKeyX
 */

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 * @param {import('web3').default} web3
 * @returns {function(number, number): Promise<Array<Validator>>} Function that returns all active validators
 */
const getValidators = (registry, web3, chainId) => async (offset = 0, limit = 100) => {
  const addresses = await registry.methods.getActiveValidators(String(offset), limit).call()

  const multicall = new Multicall({ provider: web3.currentProvider, multicallAddress: MulticallAddress })
  const result = await multicall.aggregate(
    addresses.map(addr => registry.methods.getValidator(addr))
  )

  return mapValidators(result);
}

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 * @returns {function(string): Promise<Validator|null>} Returns null if validator is not found
 */
const getValidator = (registry) => async (walletAddr) => {
  return await _loadValidator(registry, walletAddr)
}

/** @param {import('contracts-js').ValidatorRegistryContext} registry */
const getValidatorsMinimalStake = (registry) => async () => {
  return await registry.methods.stakeMinimum().call()
}

/** @param {import('contracts-js').ValidatorRegistryContext} registry */
const getValidatorsRegisterStake = (registry) => async () => {
  return await registry.methods.stakeRegister().call()
}

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 * @param {string} id
 * @returns {Promise<Validator|null>}
 */
const _loadValidator = async (registry, id) => {
  const data = await registry.methods.getValidator(id).call().catch(err => {
    if (err.data === getHash("ValidatorNotFound()")) {
      return null
    }
    throw err
  });

  if (!data) {
    return null
  }

  return mapValidator(data)
}

/**
 * @param {import('contracts-js/dist/generated-types/ValidatorRegistry').ValidatorResponse[]} validators
 * @returns {Validator[]}
 */
const mapValidators = (validators) => {
  return validators.map(mapValidator)
}

/**
 * @param {import('contracts-js/dist/generated-types/ValidatorRegistry').ValidatorResponse} validator
 * @returns {Validator}
 */
const mapValidator = (validator) => {
  return {
    stake: validator[0],
    addr: validator[1],
    pubKeyYparity: validator[2],
    lastComplainer: validator[3],
    complains: validator[4],
    host: validator[5],
    pubKeyX: validator[6]
  }
}

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 * @param {import('web3').default} web3
 */
const deregisterValidator = (registry, web3) => async ({ walletId, privateKey }) => {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey)
  web3.eth.accounts.wallet.create(0).add(account)

  const estimatedGas = await registry.methods
    .validatorDeregister()
    .estimateGas({ from: walletId });

  await registry.methods.validatorDeregister().send({ from: walletId, gas: estimatedGas });
}

/**
 * @typedef {Object} RegisterValidatorRequest
 * @property {string} privateKey
 * @property {string} stake
 * @property {string} host
 * @property {string} walletId
 */

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 * @param {import('web3').default} web3
 * @param {import('contracts-js').LumerinContext} lumerin
 * @returns {function(RegisterValidatorRequest): Promise<void>} Function that takes a request object and registers a validator
 */
const registerValidator = (registry, web3, lumerin) => async (request) => {
  const privateKey = request.privateKey;
  const tempWallet = ethereumWallet.fromPrivateKey(
    Buffer.from(remove0xPrefix(privateKey), 'hex')
  )
  const pubKey = add65BytesPrefix(tempWallet.getPublicKey().toString('hex'));
  const { yParity, x } = compressPublicKey(pubKey);

  const account = web3.eth.accounts.privateKeyToAccount(privateKey)
  web3.eth.accounts.wallet.create(0).add(account)

  const increaseAllowanceEstimate = await lumerin.methods
    .increaseAllowance(registry.options.address, request.stake)
    .estimateGas({
      from: request.walletId,
    })

  await lumerin.methods
    .increaseAllowance(registry.options.address, request.stake)
    .send({
      from: request.walletId,
      gas: increaseAllowanceEstimate,
    })

  try {
    const estimatedGas = await registry.methods
      .validatorRegister(request.stake, yParity, x, request.host)
      .estimateGas({ from: request.walletId });

    await registry.methods.validatorRegister(
      request.stake, yParity, x, request.host)
      .send({ from: request.walletId, gas: estimatedGas });
  } catch (err) {
    console.log("validator register error", err)
    throw err
  }
}

/** @param {Uint8Array|string} pubKey */
const compressPublicKey = (pubKey) => {
  const point = secp256k1.ProjectivePoint.fromHex(pubKey);
  const compressed = point.toRawBytes(true);

  return {
    yParity: compressed[0] === hexToBytes("03")[0],
    x: "0x" + bytesToHex(compressed.slice(1)),
  };
}

/** @param {boolean} yParity @param {`0x${string}`} x */
const decompressPublicKey = (yParity, x) => {
  const xBytes = hexToBytes(x.replace("0x", ""))

  const rec = new Uint8Array(33);
  rec.set(hexToBytes(yParity ? "03" : "02"));
  rec.set(xBytes, 1);

  const decompressed = secp256k1.ProjectivePoint.fromHex(bytesToHex(rec));

  return "0x" + bytesToHex(decompressed.toRawBytes(false));
}

/**
 * Returns solidity function (error, event) selector hash of the given signature
 * @param {string} signature 
 * */
const getHash = (signature) => {
  return keccak256(signature).slice(0, 10)
}

module.exports = {
  getValidator,
  getValidators,
  getValidatorsMinimalStake,
  getValidatorsRegisterStake,
  registerValidator,
  decompressPublicKey,
  deregisterValidator
}
