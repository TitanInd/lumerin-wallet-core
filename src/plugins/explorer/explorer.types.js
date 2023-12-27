/**
 * @typedef Indexer
 * @property {(from: string, to: string, address: string, tokenAddress: string, page: number, pageSize: number) => Promise<TokenTxResItem[]>} getTokenTransactions
 * @property {(from: string, to: string, address: string, tokenAddress: string, page: number, pageSize: number) => Promise<TxListResItem[]>} getEthTransactions
*/

/**
 * @typedef TokenTxResItem
 * @prop {string} blockNumber: '48651460',
 * @prop {string} timeStamp: '1697549374',
 * @prop {string} hash: '0x4c97a8c505e0e1ee15cd5788a44fd137ea475821b037b1bd9e36f0efb771f08a',
 * @prop {string} nonce: '27',
 * @prop {string} blockHash: '0x998bcbb22a4c769b088a26e0ddc9faba69b37b5f75f2b66b8a2b1160781d9f94',
 * @prop {string} from: '0x1441bc52156cf18c12cde6a92ae6bde8b7f775d4',
 * @prop {string} to: '0x6370ec8171bf9c0f858859b6430ab49149ac517c',
 * @prop {string} contractAddress: '0x769313b5dfa559a592587bda63e083487db4dd74',
 * @prop {string} value: '100000000',
 * @prop {string} tokenName: 'Lumerin',
 * @prop {string} tokenSymbol: 'LMR',
 * @prop {string} tokenDecimal: '8',
 * @prop {string} transactionIndex: '1',
 * @prop {string} gas: '465374',
 * @prop {string} gasPrice: '2600000000',
 * @prop {string} gasUsed: '444521',
 * @prop {string} cumulativeGasUsed: '444521',
 * @prop {string} input: 'deprecated',
 * @prop {string} confirmations: '302292'
 */

/**
 * @typedef TxListResItem
 * @prop {string} blockNumber: '48651460',
 * @prop {string} timeStamp: '1697549374',
 * @prop {string} hash: '0x4c97a8c505e0e1ee15cd5788a44fd137ea475821b037b1bd9e36f0efb771f08a',
 * @prop {string} nonce: '27',
 * @prop {string} blockHash: '0x998bcbb22a4c769b088a26e0ddc9faba69b37b5f75f2b66b8a2b1160781d9f94',
 * @prop {string} transactionIndex: '1',
 * @prop {string} from: '0x1441bc52156cf18c12cde6a92ae6bde8b7f775d4',
 * @prop {string} to: '0xa86b306790ece69bddcfb4c4fac3847524ce7e08',
 * @prop {string} value: '200000000000000',
 * @prop {string} gas: '465374',
 * @prop {string} gasPrice: '100000000',
 * @prop {string} gasPriceBid: '2600000000',
 * @prop {string} isError: '0',
 * @prop {string} txreceipt_status: '1',
 * @prop {string} input: '0xee878a4a0000000000000000000000006370ec8171bf9c0f858859b6430ab49149ac517c00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000017e303466376532383238646538613564313931633666666165313638306534303165316262363961393833633136366138356136383961393735373730326130393361336235393134303963666465633530343739303734326261623030383663613934353862336664363232643832303439663766343637623832613563376364613162613038393461613431356236663838616462663235633236323337303933623438366631386662373332653832353531623338613466623132323139613661656536656436636461326661326337313930353831636139346535393538376433653939316132323061333533333032373966363336383933663966653165643231366363346133383431616538613739666331636331616238663133366530343562353433323231363364333936333133383634323139373465633936336536653234633238623430386536393365393034393136386265616233303939316136373030653539366131646538333661666662643733616639640000',
 * @prop {string} contractAddress: '',
 * @prop {string} cumulativeGasUsed: '444521',
 * @prop {string} gasUsed: '444521',
 * @prop {string} confirmations: '302300',
 * @prop {string} methodId: '0xee878a4a',
 * @prop {string} functionName: ''
 */

/**
 * @typedef {Object} TransactionEvent
 * if event is associated with a contract interaction, this will be named after the method, 
 * if not, it will be just transafer
 * @property {TransactionType} type 
 * @property {string} txhash
 * @property {number} blockNumber
 * @property {string} timestamp
 * @property {number} transactionFee // blockchain transaction fee
 * array of transfers involved in the transaction
 * @property {{token: "LMR"|"ETH", from: string, to: string, amount: string}[]} transfers
 */

/**
 * @typedef {"transfer" | "purchase" | "closeout" | "create" | "update" | "delete"} TransactionType
 */

/** 
 * @typedef { Promise < T > & { once?: (e: string, cb: (payload: T) => void) => PromiEvent < T >, removeAllListeners: () => void } } PromiEvent < T >
 * @template { any } T
 */

/**
 * @typedef {import("web3-utils").AbiItem & {signature?: string}} AbiItemSignature 
 */