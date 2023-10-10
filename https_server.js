const fs = require('fs');
const https = require('https');
const { swagger, openAPIValidator } = require('./swagger');
const { FabricGateway, loadCredentials } = require('./fabric-gateway-wrapper');

// Import the express module
const express = require("express");

const app = express();
const hostname = '0.0.0.0';
const port = 8888;
const key = '12345';

const Contracts = {
	Info: 'Info'
};

const credentials = loadCredentials(
	'/etc/hyperledger/client/athenarc/client/client1/msp/signcerts/cert.pem',
	'/etc/hyperledger/client/athenarc/client/client1/msp/keystore/key.pem',
	'/etc/hyperledger/client/tls-chain-cert/tls-ca-cert.pem',
	'/etc/hyperledger/client/athenarc/peer/ledger1/tls/keystore/key.pem',
	'/etc/hyperledger/client/athenarc/peer/ledger1/tls/signcerts/cert.pem'
);

const gateway = new FabricGateway('ledger1.drosatos.eu:7051', credentials)

// middleware that handles authorization
const checkAuthorization = (req, res, next) => {
	if (key !== req.headers["authorization"]) {
		return res.status(401).json({ "result": "Unauthorized attempt!", "success": false });
	}
	next();
};

// set up swagger
swagger(app, port)

// apply json middleware globally
app.use(express.json())

// apply authorization middleware globally
app.use(checkAuthorization);

// setup OpenAPI validator
openAPIValidator(app)

// create server
https.createServer(
		// Provide the private and public key to the server by reading each
		// file's content with the readFileSync() method.
    {
      key: fs.readFileSync(__dirname+"/key.pem"),
      cert: fs.readFileSync(__dirname+"/cert.pem"),
    },
    app
  )
  .listen(port, hostname, () => {
    console.log("Server listening on https://"+hostname+":"+port+"/");
  });
  

/**
 * @swagger
 *
 * /api:
 *  post:
 *    tags:
 *      - API
 *    summary: Executes a command
 *    requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             command:
 *               type: string
 *             id:
 *               type: integer
 *             data:
 *               type: string
 *           required:
 *             - id
 *             - command
 *           example:
 *             command: write
 *             id: 1
 *             data: some data
 *    responses:
 *      '200':
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *              example:
 *                result: Complete!
 *                success: true
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */
  // STATIC API URL
app.post('/api', async (req, res, next) => {
	try {
		const command = req.body["command"];
		if (typeof command !== 'undefined' && command) {
			await post_command_controller(command.toLowerCase(), req, res);
		} else {
			res.status(400).json({ "result": "Command parameter is missing!", "success": false });
		}
	} catch (error) {
		next(error);
	}
});

  // DYNAMIC API POST URL
app.post('/api/:command', async (req, res, next) => {
	try {
		await post_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// DYNAMIC API POST URL FOR PRIVATE COLLECTIONS
app.post('/api/:command/collections/:collection', async (req, res, next) => {
	try {
		await post_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// DYNAMIC API PUT URL
app.put('/api/:command/:id', async (req, res, next) => {
	try {
		await put_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// DYNAMIC API PUT URL FOR SPECIFIC ITEMS OF PRIVATE COLLECTIONS
app.put('/api/:command/:id/collections/:collection', async (req, res, next) => {
	try {
		await put_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// DYNAMIC API GET URL
app.get('/api/:command', async (req, res, next) => {
	try {
		await get_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// DYNAMIC API GET URL FOR SPECIFIC ITEMS
app.get('/api/:command/:id', async (req, res, next) => {
	try {
		await get_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// DYNAMIC API GET URL FOR SPECIFIC ITEMS OF PRIVATE COLLECTIONS
app.get('/api/:command/:id/collections/:collection', async (req, res, next) => {
	try {
		await get_command_controller(req.params.command.toLowerCase(), req, res);
	} catch (error) {
		next(error);
	}
});

// register error handler
app.use((err, req, res, next) => {
	// format error
	res.status(err.status || 500).json({
		result: err.message,
		success: false,
	});
});

async function post_command_controller(command, req, res) {
	const commands = {
		'meters': write
	};

	await command_controller(commands, command, req, res);
}

async function put_command_controller(command, req, res) {
	const commands = {
		'meters': update
	};

	await command_controller(commands, command, req, res);
}

async function get_command_controller(command, req, res) {
	const commands = {
		'meters': read
	};

	await command_controller(commands, command, req, res);
}

async function command_controller(commands, command, req, res) {
	if (!command) {
		return res.status(400).json({ "result": "Command parameter is missing!", "success": false });
	}

	const func = commands[command.toLowerCase()];

	if (func) {
		await func(res, req, req.body);
	} else {
		res.status(404).json({ "result": "Command not found!", "success": false });
	}
}


/**
 * @swagger
 *
 * /api/write:
 *  post:
 *    tags:
 *      - Write
 *    summary: Writes some data
 *    requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             data:
 *               type: string
 *           required:
 *             - id
 *           example:
 *             id: 1
 *             data: some data
 *    responses:
 *      '200':
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *              example:
 *                result: Complete!
 *                success: true
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */
async function write(res, req, body) {
	try {
		const result = await gateway.execute('channel1', Contracts.Info, 'CreateAsset', req.params.command.toLowerCase(), String(body.id), JSON.stringify(body), req.params.collection || '')
		res.status(200).json({ message: "Item added!", success: true, result });
	} catch (error) {
		throw new Error(JSON.stringify(error.details))
	}
}

async function update(res, req, body) {
	try {
		const { id, ...data } = body;
		const result = await gateway.execute('channel1', Contracts.Info, 'UpdateAsset', req.params.command.toLowerCase(), req.params.id.toLowerCase(), JSON.stringify(data), req.params.collection || '')
		res.status(200).json({ message: "Item updated!", success: true, result });
	} catch (error) {
		throw new Error(JSON.stringify(error.details))
	}
}

/**
 * @swagger
 *
 * /api/read:
 *  get:
 *    tags:
 *      - Read
 *    summary: Reads some data
 *    responses:
 *      '200':
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *              example:
 *                result: Complete!
 *                success: true
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */
async function read(res, req) {
	try {
		const result = await gateway.query('channel1', Contracts.Info, 'ReadAsset', req.params.command.toLowerCase(), req.params.id, req.params.collection || '')
		res.status(200).json({ message: "Item added!", success: true, result });
	} catch (error) {
		throw new Error(JSON.stringify(error.details))
	}
}
