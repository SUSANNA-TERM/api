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

const IDMapper = {
	meterstatuses(req) {
		return req.body.meterstatus_id;
	}
}

const Chaincodes = {
	Info: 'Info',
	Readings: 'Readings'
};

const Functions = {
	CreateAsset: 'Asset:CreateAsset',
	ReadAsset: 'Asset:ReadAsset',
	UpdateAsset: 'Asset:UpdateAsset',
	DeleteAsset: 'Asset:DeleteAsset',
	AssetExists: 'Asset:AssetExists',
	GetAllAssets: 'Asset:GetAllAssets',
	GetAllMeters: 'Info:GetAllMeters',
	Query: 'Readings:Query'
}

const credentials = loadCredentials(
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/msp/signcerts/cert.pem',
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/msp/keystore/key.pem',
	'/etc/hyperledger/client/zitsa/tls-chain-cert/tls-ca-cert.pem',
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/tls/keystore/key.pem',
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/tls/signcerts/cert.pem'
);

const gateway = new FabricGateway('ledger1.drosatos.eu:7051', credentials)

// middleware that handles authorization
const checkAuthorization = (req, res, next) => {
	if (key !== req.headers["authorization"]) {
		return res.status(401).json({ "result": "Unauthorized attempt!", "success": false });
	}
	next();
};


// middleware that checks if the hyperledger gateway is connected
const gatewayStatus = (req, res, next) => {
	if (!gateway.connected) {
		next(new Error(`Gateway not connected. Details: ${gateway.connectionError.toString()}`))
	}
	next();
}

// set up swagger
swagger(app, port)

// apply json middleware globally
app.use(express.json())

// apply authorization middleware globally
app.use(checkAuthorization);

// setup OpenAPI validator
openAPIValidator(app)

// check gateway status prior to any request
app.use(gatewayStatus)

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

// STATIC API GET URL THAT RETURNS ALL METERS IN A CONCISE RESPONSE
app.get('/api/Meters/concise', async (req, res, next) => {
	try {
		const result = await gateway.query('channel1', Chaincodes.Info, Functions.GetAllMeters, '')
		res.status(200).json({ message: "Item retrieved!", success: true, result });
	} catch (error) {
		next(error)
	}
});

// STATIC API GET URL THAT RETURNS ALL METERS OF A PRIVATE COLLECTION IN A CONCISE RESPONSE
app.get('/api/Meters/concise/collections/:collection', async (req, res, next) => {
	try {
		const result = await gateway.query('channel1', Chaincodes.Info, Functions.GetAllMeters, req.params.collection)
		res.status(200).json({ message: "Item retrieved!", success: true, result });
	} catch (error) {
		next(error)
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

// DYNAMIC API GET URL FOR SPECIFIC COLLECTIONS
app.get('/api/:command/collections/:collection', async (req, res, next) => {
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
	if (err.details && err.details.length) {
		err = new Error(JSON.stringify(err.details))
	}

	// format error
	res.status(err.status || 500).json({
		result: err.message,
		success: false,
	});
});

async function post_command_controller(command, req, res) {
	const commands = {
		'meters': write,
		'locations': write,
		'metertypes': write,
		'meterstatuses': write,
		'readings': readingsByRange
	};

	await command_controller(commands, command, req, res);
}

async function put_command_controller(command, req, res) {
	const commands = {
		'meters': update,
		'locations': update,
		'metertypes': update,
		'meterstatuses': update
	};

	await command_controller(commands, command, req, res);
}

async function get_command_controller(command, req, res) {
	const commands = {
		'meters': read,
		'locations': read,
		'metertypes': read,
		'meterstatuses': read
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


async function write(res, req, body) {
	try {
		let { command, id, collection } = req.params;
		command = req.params.command.toLowerCase();

		if (IDMapper.hasOwnProperty(command)) {
			id = IDMapper[command](req);
		}

		const result = await gateway.execute('channel1', Chaincodes.Info, Functions.CreateAsset, command, String(id), JSON.stringify(body), collection || '')
		res.status(200).json({ message: "Item added!", success: true, result });
	} catch (error) {
		throw error
	}
}

async function update(res, req, body) {
	try {
		const { id, ...data } = body;
		const result = await gateway.execute('channel1', Chaincodes.Info, Functions.UpdateAsset, req.params.command.toLowerCase(), req.params.id.toLowerCase(), JSON.stringify(data), req.params.collection || '')
		res.status(200).json({ message: "Item updated!", success: true, result });
	} catch (error) {
		throw error
	}
}


async function read(res, req) {
	try {
		let result;
		const { command, id, collection } = req.params;

		if (id && collection) {
			result = await gateway.query('channel1', Chaincodes.Info, Functions.ReadAsset, command.toLowerCase(), id, collection)
		} else if (id && !collection) {
			result = await gateway.query('channel1', Chaincodes.Info, Functions.ReadAsset, command.toLowerCase(), id, '')
		} else {
			result = await gateway.query('channel1', Chaincodes.Info, Functions.GetAllAssets, req.params.command.toLowerCase(), req.params.collection || '')
		}
		res.status(200).json({ message: "Item retrieved!", success: true, result });
	} catch (error) {
		throw error
	}
}


async function readingsByRange(res, req, body) {
	try {
		const { start_date, end_date, location_id } = body;
		const queryString = JSON.stringify({
			"selector": {
				"sensor_date": {
					"$gte": start_date,
					"$lte": end_date
				},
				"location_id": location_id
			}
		});

		const result = await gateway.execute('channel1', Chaincodes.Readings, Functions.Query, queryString, req.params.collection || '')
		res.status(200).json({ message: "Item updated!", success: true, result });
	} catch (error) {
		throw error
	}
}