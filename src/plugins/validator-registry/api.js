const ethereumWallet = require('ethereumjs-wallet').default
const { remove0xPrefix, add65BytesPrefix } = require('../contracts/helpers')
const { secp256k1 } = require('@noble/curves/secp256k1');
const { hexToBytes, bytesToHex } = require('@noble/curves/abstract/utils');

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 */
const getValidators = (registry) => async () => {
    const ids = await registry.methods.getActiveValidators("0", 100).call()

    const result = await Promise.all(ids.map(id => {
        return _loadValidator(registry, id);
    }))
    return result;
}

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 */
const getStake = (registry) => async () => {
    return await registry.methods.stakeMinimum().call()
}

const _loadValidator = async (registry, id) => {
    const data = await registry.methods.getValidator(id).call();
    return  {
        stake: data[0],
        addr: data[1],
        pubKeyYparity: data[2],
        lastComplainer: data[3],
        complains: data[4],
        host: data[5],
        pubKeyX: data[6]
    }
}

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 */
const deregisterValidator = (registry) => async (walletId) => {
    await registry.methods.validatorDeregister().send({ from: walletId });
}

/**
 * @param {import('contracts-js').ValidatorRegistryContext} registry
 * @param {import('web3').default} web3
 * @param {import('contracts-js').LumerinContext} lumerin
 * @param {import('contracts-js').CloneFactoryContext} cloneFactory
 */
const registerValidator = (registry, web3, lumerin, cloneFactory) => async (request) => {

    const privateKey = request.privateKey;
    const tempWallet = ethereumWallet.fromPrivateKey(
        Buffer.from(remove0xPrefix(privateKey), 'hex')
    )
    const pubKey = tempWallet.getPublicKey();
    const { yParity, x } = compressPublicKey(pubKey);
  
    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.create(0).add(account)

    const stake = await getStake(registry)();

    const increaseAllowanceEstimate = await lumerin.methods
    .increaseAllowance(cloneFactory.options.address, stake)
    .estimateGas({
      from: request.walletId,
    })

  await lumerin.methods
    .increaseAllowance(cloneFactory.options.address, stake)
    .send({
      from: request.walletId,
      gas: increaseAllowanceEstimate,
    })

    const estimatedGas =  await registry.methods
    .validatorRegister(request.stake, yParity, x, request.host)
    .estimateGas({ from: request.walletId });

    await registry.methods.validatorRegister(
        request.stake, yParity, x, request.host)
        .send({ from: request.walletId, gas: estimatedGas });
}

const compressPublicKey = (pubKey) => {
  const point = secp256k1.ProjectivePoint.fromHex(pubKey);
  const compressed = point.toRawBytes(true);

  return {
    yParity: compressed[0] === hexToBytes("03")[0],
    x: bytesToHex(compressed.slice(1)),
  };
}

module.exports = {
    getValidators,
    registerValidator,
    deregisterValidator
}
