const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const crypto = require('crypto');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const tls = require('tls');
const os = require('os');

const utf8Decoder = new TextDecoder();

function loadCredentials(clientCredentialsPath, clientPrivateKeyPath, clientTlsCertPath, peerPrivateKeyPath, certChainPath) {
    return {
        clientCredentials: fs.readFileSync(clientCredentialsPath),
        clientPrivateKey: crypto.createPrivateKey(fs.readFileSync(clientPrivateKeyPath)),
        clientTlsCert: fs.readFileSync(clientTlsCertPath),
        peerPrivateKey: fs.readFileSync(peerPrivateKeyPath),
        certChain: fs.readFileSync(certChainPath)
    }
}

class FabricGateway {
    constructor(address, { clientCredentials, clientPrivateKey, clientTlsCert, peerPrivateKey, certChain } = {}) {
        const signer = signers.newPrivateKeySigner(clientPrivateKey);
        const systemRootCerts = Buffer.from(tls.rootCertificates.join(os.EOL));
        const rootCerts = Buffer.concat([clientTlsCert, systemRootCerts])
        const identity = { mspId: 'Athenarc', credentials: clientCredentials };
        this.client = new grpc.Client(address, grpc.credentials.createSsl(rootCerts, peerPrivateKey, certChain, false));
        this.gateway = connect({ identity, signer, client: this.client });
    }

    async execute(channel, contract, method, ...args) {
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
