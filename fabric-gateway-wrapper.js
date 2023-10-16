const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const tls = require('tls');
const os = require('os');

const utf8Decoder = new TextDecoder();

function loadCredentials(clientCredentialsPath, clientPrivateKeyPath, clientTlsCertPath, peerPrivateKeyPath, certChainPath) {
    try {
        const credentials = {
            clientCredentials: fs.readFileSync(clientCredentialsPath),
            clientPrivateKey: crypto.createPrivateKey(fs.readFileSync(clientPrivateKeyPath)),
            clientTlsCert: fs.readFileSync(clientTlsCertPath),
            peerPrivateKey: fs.readFileSync(peerPrivateKeyPath),
            certChain: fs.readFileSync(certChainPath)
        };

        return credentials;
    } catch (error) {
        return {}
    }
}

// TODO: add function that checks gateway connection so that it can be called prior to any request
class FabricGateway {
    constructor(address, { clientCredentials, clientPrivateKey, clientTlsCert, peerPrivateKey, certChain } = {}) {
        try {
            const signer = signers.newPrivateKeySigner(clientPrivateKey);
            const systemRootCerts = Buffer.from(tls.rootCertificates.join(os.EOL));
            const rootCerts = Buffer.concat([clientTlsCert, systemRootCerts])
            const identity = { mspId: 'Athenarc', credentials: clientCredentials };

            this.client = new grpc.Client(address, grpc.credentials.createSsl(rootCerts, peerPrivateKey, certChain, false));
            this.gateway = connect({ identity, signer, client: this.client });
            this.connected = true;
        } catch (error) {
            this.connected = false;
            this.connectionError = error;
        }
    }

    async execute(channel, contract, method, ...args) {
        if (!this.connected) {
            throw this.connectionError;
        }

        const network = this.gateway.getNetwork(channel);
        const contractInstance = network.getContract(contract);

        let result = await contractInstance.submitTransaction(method, ...args);
        result = utf8Decoder.decode(result);

        try {
            result = JSON.parse(result)
        } catch (error) {
            // pass
        }

        return result;
    }

    async query(channel, contract, method, ...args) {
        if (!this.connected) {
            throw this.connectionError;
        }

        const network = this.gateway.getNetwork(channel);
        const contractInstance = network.getContract(contract);

        let result = await contractInstance.evaluateTransaction(method, ...args);
        result = utf8Decoder.decode(result);

        try {
            result = JSON.parse(result)
        } catch (error) {
            // pass
        }

        return result;
    }
}


module.exports = {
    FabricGateway,
    loadCredentials
}
