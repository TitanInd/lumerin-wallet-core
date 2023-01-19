const axios = require('axios').default

const getRate = () =>
  axios
    .get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: 'ethereum,lumerin',
        vs_currencies: 'usd',
      },
    })
    .then((response) => {
      return {
        LMR: response?.data?.lumerin?.usd || null,
        ETH: response?.data?.ethereum?.usd || null,
      }
    })

module.exports = { getRate }
