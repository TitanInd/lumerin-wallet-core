const url = require('url');

const test = 'https://proxyrouter.stg.lumerin.io:8080'
console.log(url.parse(test).host)