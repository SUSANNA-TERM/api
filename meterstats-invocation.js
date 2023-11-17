/* 
Run via crontab e.g.:
12 15 * * * NODE_TLS_REJECT_UNAUTHORIZED='0' /<path-to-node>/node /<path-to-api>/meterstats-invocation.js >> /<path-to-logfile>/logfile.log 2>> /<path-to-error-logfile>/error.log
*/
const https = require('https');
const config = require('./config/config.json');

const data = JSON.stringify({
    date: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) // trigger stats calculation for yesterday
});

const options = {
    hostname: config.server.hostname,
    port: config.server.port,
    path: '/api/MeterStats',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'authorization': Object.keys(config.apiKeys).find(key => config.apiKeys[key] === 'admin')
    }
};

const req = https.request(options, (res) => {
    res.on('data', (d) => {
        console.log(d.toString());
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
