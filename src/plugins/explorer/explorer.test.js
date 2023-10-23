/**
 * @type {typeof import('web3').default}
 */
//@ts-ignore
const Web3 = require('web3')
const { Lumerin, CloneFactory } = require('contracts-js');
const { mapSentTxToTxEvent } = require('./explorer-mapper');
const { expect } = require('chai');

describe('mapper tests', () => {
  const web3 = new Web3('http://localhost:8545')

  const lumerinAddr = "0x0000000000000000000000000000000000000000"
  const cfAddr = "0x0000000000000000000000000000000000000000"

  const lumerin = Lumerin(web3, lumerinAddr)
  const cf = CloneFactory(web3, cfAddr)
  //@ts-ignore
  const abis = [...lumerin._jsonInterface, ...cf._jsonInterface]

  it('should map closeout correctly', () => {
    const tx = {
      "transaction": {
        "hash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
        "type": 2,
        "accessList": [],
        "blockHash":
          "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da",
        "blockNumber": 44,
        "transactionIndex": 0,
        "confirmations": 1,
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "gasPrice": "1000",
        "maxPriorityFeePerGas": "1000",
        "maxFeePerGas": "1000",
        "gasLimit": "1000",
        "to": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
        "value": "2000",
        "nonce": 30,
        "data": "0xd7ef57a20000000000000000000000009bd03768a7dcc129555de410ff8e85528a4f88b50000000000000000000000000000000000000000000000000000000000000000",
        "r": "0xeddd9b62b1a9147458abf09d55b1b67a2e9327ca1b2996040f32cb3b9de7603f",
        "s": "0x6e84c45bbf9460af71f33ca2861fda772e0d79facf7ca11efb37eacd2cd6bf2f",
        "v": "0",
        "creates": null,
        "chainId": "31337"
      },
      "receipt": {
        "to": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
        "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "contractAddress": null,
        "transactionIndex": 0,
        "gasUsed": 1000,
        "logsBloom": "0x00020000000000000002000000400000010000000000000000000000000000010000000000000000000400000000000000000000000000000000000000000000000000000000000000000008000000000000000010000000010000000000000000000840000000000000000100000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000200000008000000000000000000000000000800000000000000010000000000000200000000000042000000200000000000000000000000002000000000200000000001000000000000000000000000000000000001000000008000000004000000000000",
        "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da",
        "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
        "logs": [{
          "transactionIndex": 0,
          "blockNumber": 44,
          "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
          "address": "0x9bd03768a7DCc129555dE410FF8E85528A4F88b5",
          "topics": ["0xaadd128c35976a01ffffa9dfb8d363b3358597ce6b30248bcf25e80bd3af4512",
            "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"],
          "data": "0x",
          "logIndex": 0,
          "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da"
        }, {
          "transactionIndex": 0,
          "blockNumber": 44,
          "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
          "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000009bd03768a7dcc129555de410ff8e85528a4f88b5",
            "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"],
          "data": "0x0000000000000000000000000000000000000000000000000000000005f49b7b",
          "logIndex": 1,
          "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da"
        }, {
          "transactionIndex": 0,
          "blockNumber": 44,
          "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
          "address": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
          "topics": ["0x61cf0b3820dc69659f8669254f3b445c24c7080cb569a6316dacca8400b05e3b",
            "0x0000000000000000000000009bd03768a7dcc129555de410ff8e85528a4f88b5"],
          "data": "0x0000000000000000000000000000000000000000000000000000000000000000",
          "logIndex": 2,
          "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da"
        }],
        "blockNumber": 44,
        "confirmations": 1,
        "cumulativeGasUsed": 1000,
        "effectiveGasPrice": 1000,
        "status": true,
        "type": 2,
        "byzantium": true,
        "events": [{
          "transactionIndex": 0,
          "blockNumber": 44,
          "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
          "address": "0x9bd03768a7DCc129555dE410FF8E85528A4F88b5",
          "topics": ["0xaadd128c35976a01ffffa9dfb8d363b3358597ce6b30248bcf25e80bd3af4512",
            "0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266"],
          "data": "0x",
          "logIndex": 0,
          "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da"
        }, {
          "transactionIndex": 0,
          "blockNumber": 44,
          "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
          "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000009bd03768a7dcc129555de410ff8e85528a4f88b5",
            "0x00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8"],
          "data": "0x0000000000000000000000000000000000000000000000000000000005f49b7b",
          "logIndex": 1,
          "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da"
        }, {
          "transactionIndex": 0,
          "blockNumber": 44,
          "transactionHash": "0x11adf820d448e3eda4ea387d93c3a9f6bc45ec49a8ca998e236cea16693e5526",
          "address": "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
          "topics": ["0x61cf0b3820dc69659f8669254f3b445c24c7080cb569a6316dacca8400b05e3b",
            "0x0000000000000000000000009bd03768a7dcc129555de410ff8e85528a4f88b5"],
          "data": "0x0000000000000000000000000000000000000000000000000000000000000000",
          "logIndex": 2,
          "blockHash": "0xa88720eea0d2919dbce118f1df3eea63562323a777df9f2fc3ae7b1e78c726da",
          "args": ["0x9bd03768a7DCc129555dE410FF8E85528A4F88b5", "0"],
          "event": "contractClosed",
          "eventSignature": "contractClosed(address,uint256)"
        }]
      }
    }

    //@ts-ignore
    const data = mapSentTxToTxEvent(abis, tx)
    console.log(data);
    expect(data.type).to.be.equal('closeout')
  })
})