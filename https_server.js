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

const Chaincodes = {
	Info: 'Info'
};

const Functions = {
	CreateAsset: 'Asset:CreateAsset',
	ReadAsset: 'Asset:ReadAsset',
	UpdateAsset: 'Asset:UpdateAsset',
	DeleteAsset: 'Asset:DeleteAsset',
	AssetExists: 'Asset:AssetExists',
	GetAllAssets: 'Asset:GetAllAssets',
	GetAllMeters: 'Info:GetAllMeters'
}

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
 *        $ref: '#/components/responses/Success'
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
 * /api/Meters:
 *  post:
 *    tags:
 *      - Meter
 *    summary: Writes the given meter in the blockchain
 *    requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           allOf:
 *             - $ref: '#/components/schemas/Meter'
 *             - required:
 *               - id
 *               - meter_id
 *               - type
 *               - metertype_id
 *               - type_id
 *               - mote
 *               - barcode
 *               - consumer
 *               - provision
 *               - lat
 *               - lng
 *               - address
 *               - description
 *               - region_id
 *               - location_id
 *               - address_name
 *    responses:
 *      '200':
 *        $ref: '#/components/responses/Success'
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 *
 * /api/Meters/collections/{collection}:
 *  post:
 *    tags:
 *      - Meter
 *    summary: Writes the given meter in a private collection in the blockchain
 *    parameters:
 *      - name: collection
 *        in: path
 *        required: true
 *        description: The private collection in which the meter should be written
 *        schema:
 *          type : string
 *    requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           allOf:
 *             - $ref: '#/components/schemas/Meter'
 *             - required:
 *               - id
 *               - meter_id
 *               - type
 *               - metertype_id
 *               - type_id
 *               - mote
 *               - barcode
 *               - consumer
 *               - provision
 *               - lat
 *               - lng
 *               - address
 *               - description
 *               - region_id
 *               - location_id
 *               - address_name
 *    responses:
 *      '200':
 *        $ref: '#/components/responses/Success'
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */
async function write(res, req, body) {
	try {
		const result = await gateway.execute('channel1', Chaincodes.Info, Functions.CreateAsset, req.params.command.toLowerCase(), String(body.id), JSON.stringify(body), req.params.collection || '')
		res.status(200).json({ message: "Item added!", success: true, result });
	} catch (error) {
		throw new Error(JSON.stringify(error.details))
	}
}


/**
 * @swagger
 *
 * /api/Meters/{id}:
 *  put:
 *    tags:
 *      - Meter
 *    summary: Updates the meter with the given ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the meter
 *        schema:
 *          type : string
 *    requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Meter'
 *    responses:
 *      '200':
 *        $ref: '#/components/responses/Success'
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 *
 * /api/Meters/{id}/collections/{collection}:
 *  put:
 *    tags:
 *      - Meter
 *    summary: Updates the meter that belongs to the specified private collection and corresponds to the given ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the meter
 *        schema:
 *          type : string
 *      - name: collection
 *        in: path
 *        required: true
 *        description: The private collection in which the meter belongs
 *        schema:
 *          type : string
 *    requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Meter'
 *    responses:
 *      '200':
 *        $ref: '#/components/responses/Success'
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */
async function update(res, req, body) {
	try {
		const { id, ...data } = body;
		const result = await gateway.execute('channel1', Chaincodes.Info, Functions.UpdateAsset, req.params.command.toLowerCase(), req.params.id.toLowerCase(), JSON.stringify(data), req.params.collection || '')
		res.status(200).json({ message: "Item updated!", success: true, result });
	} catch (error) {
		throw new Error(JSON.stringify(error.details))
	}
}

/**
 * @swagger
 *
 * /api/Meters/{id}:
 *  get:
 *    tags:
 *      - Meter
 *    summary: Returns a meter by ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the meter
 *        schema:
 *          type : string
 *    responses:
 *      '200':
 *        $ref: '#/components/responses/Success'
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */


/**
 * @swagger
 *
 * /api/Meters/{id}/collections/{collection}:
 *  get:
 *    tags:
 *      - Meter
 *    summary: Returns the meter that belongs to the specified private collection and corresponds to the given ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the meter
 *        schema:
 *          type : string
 *      - name: collection
 *        in: path
 *        required: true
 *        description: The private collection in which the meter belongs
 *        schema:
 *          type : string
 *    responses:
 *      '200':
 *        $ref: '#/components/responses/Success'
 *      '400':
 *        $ref: '#/components/responses/BadRequest'
 *      '401':
 *        $ref: '#/components/responses/Unauthorized'
 *      '404':
 *        $ref: '#/components/responses/NotFound'
 */
async function read(res, req) {
	try {
		const result = await gateway.query('channel1', Chaincodes.Info, Functions.GetAllAssets, req.params.command.toLowerCase(), req.params.id, req.params.collection || '')
		res.status(200).json({ message: "Item retrieved!", success: true, result });
	} catch (error) {
		throw new Error(JSON.stringify(error.details))
	}
}
