/**
 * @typedef {Object} Contract
 * @property {string} id
 * @property {string} price
 * @property {string} speed
 * @property {string} length
 * @property {string} buyer
 * @property {string} seller
 * @property {string} timestamp
 * @property {string} state - 0 available, 1 running
 * @property {string} encryptedPoolData
 * @property {string} limit
 * @property {boolean} isDead
 * @property {string} balance
 * @property {{successCount: string, failCount: string}} stats
 * @property {boolean} hasFutureTerms
 * @property {{price: string, speed: string, length: string, limit: string, version: string}} futureTerms
 * @property {string} version
 */