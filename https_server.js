const fs = require('fs');
const https = require('https');
const { swagger, openAPIValidator } = require('./swagger');
const { FabricGateway, loadCredentials } = require('./fabric-gateway-wrapper');
const config = require('./config/config.json');
const permissions = require('./config/access.json');

const HTTP_WRITE_METHOD_REGEXP = /^\b(POST|PUT|PATCH|DELETE)\b$/i;

// Import the express module
const express = require("express");

const app = express();
const hostname = '0.0.0.0';
const port = 8888;

const IDMapper = {
	meterstatuses(req) {
		return req.body.meterstatus_id;
	},
	meters(req) {
		return req.body.meter_id;
	},
	metertypes(req) {
		return req.body.metertype_id;
	},
	locations(req) {
		return req.body.location_id;
	}
}

const Validators = {
	async meterstatuses(command, res, req) {
		const { id } = req.params;
		const { lastval, value, meter_id, ...meterStatus } = req.body;
		meterStatus.consumption = value - lastval;

		const result = await gateway.query('channel1', Chaincodes.Readings, Functions.ValidateAsset, command, String(id), JSON.stringify(meterStatus), Collections[command]);
		const bridgeRecord = await gateway.query('channel1', Chaincodes.ReadingsBridge, Functions.ReadAsset, 'metertometerstatus', String(id), Collections.metertometerstatus);
		
		//  validate that the meter id from the bridge table is the same with the given meter id
		if (meter_id !== bridgeRecord.meter_id) {
			result.same = false;
		}

		res.status(200).json({ message: "Item validated!", success: true, result: result });
	},
	meters: validate,
	metertypes: validate,
	locations: validate
}

const Chaincodes = {
	Info: 'Info',
	Readings: 'Readings',
	ReadingsBridge: 'ReadingsBridge',
	MeterStats: 'MeterStats'
};

const Functions = {
	CreateAsset: 'Asset:CreateAsset',
	ReadAsset: 'Asset:ReadAsset',
	UpdateAsset: 'Asset:UpdateAsset',
	DeleteAsset: 'Asset:DeleteAsset',
	AssetExists: 'Asset:AssetExists',
	ValidateAsset: 'Asset:ValidateAsset',
	GetAllAssets: 'Asset:GetAllAssets',
	GetAllMeters: 'Info:GetAllMeters',
	AssetQuery: 'Asset:Query',
	ReadingsQuery: 'Readings:Query',
	ReadingsBridgeQuery: 'ReadingsBridge:Query',
	ProcessMeterStatus: 'ReadingsBridge:ProcessMeterStatus',
	MeterStatusesToMeters: 'ReadingsBridge:MeterStatusesToMeters'
}

const Collections = {
	meters: 'collection1',
	locations: '',
	metertypes: 'collection2',
	meterstatuses: '',
	readings: '',
	meterstats: '',
	metertometerstatus: 'collection3'
}

const credentials = loadCredentials(
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/msp/signcerts/cert.pem',
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/msp/keystore/key.pem',
	'/etc/hyperledger/client/zitsa/tls-chain-cert/tls-ca-cert.pem',
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/tls/keystore/key.pem',
	'/etc/hyperledger/client/zitsa/client/zitsa_client1/tls/signcerts/cert.pem'
);

const gateway = new FabricGateway('ledger1.drosatos.eu:7051', credentials)

// middleware that handles authorization and access control
const checkAuthorization = (req, res, next) => {
	const key = req.headers["authorization"]
	const group = config.apiKeys[key];
	
	if (!group) {
		return res.status(401).json({ "result": "Unauthorized attempt!", "success": false });
	}

	const hasAccess = permissions.some(permission => 
		permission.scope.includes(group) &&
		new RegExp('^' + permission.resource).test(req.path) &&
		((permission.access.includes('read') && req.method === 'GET') ||
		(permission.access.includes('write') && HTTP_WRITE_METHOD_REGEXP.test(req.method)))
	);

	if (!hasAccess) {
		return res.status(403).send({ "result": "Forbidden!", "success": false });
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

// POST URL TO RETRIEVE THE TOTAL CONSUMPTION OF A METER FOR A TIME FRAME
app.post('/api/Meters/:id/consumption', async (req, res, next) => {
	try {
		const { start_date, end_date } = req.body;
		const queryString = JSON.stringify({
			"selector": {
				"sensor_date": {
					"$gt": start_date,
					"$lte": end_date
				},
				"meter_id": req.params.id
			}
		});

		const result = await gateway.query('channel1', Chaincodes.ReadingsBridge, Functions.ReadingsBridgeQuery, queryString, Collections.metertometerstatus)
		res.status(200).json({ 
			message: "Total consumption calculated!",
			success: true,
			result: {
				consumption: result.reduce((sum, reading) => sum + reading.consumption, 0),
				readings: result
			}
		});
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

// DYNAMIC VALIDATION URL
app.post('/api/:command/:id/validate', async (req, res, next) => {
	try {
		const command = req.params.command.toLowerCase();
		await Validators[command](command, res, req);
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

// STATIC API GET URL THAT RETURNS ALL METERS IN A CONCISE RESPONSE
app.get('/api/Meters/concise', async (req, res, next) => {
	try {
		const result = await gateway.query('channel1', Chaincodes.Info, Functions.GetAllMeters, Collections.meters)
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

// DYNAMIC API GET URL FOR SPECIFIC ITEMS
app.get('/api/:command/:id', async (req, res, next) => {
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
		'meterstatuses': writeMeterStatuses,
		'meterstats': writeMeterStats
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
		'meterstatuses': read,
		'readings': readingsByRange,
		'meterstats': statsByRange
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
		command = command.toLowerCase();
		collection = Collections[command];

		if (IDMapper.hasOwnProperty(command)) {
			id = IDMapper[command](req);
		}

		const result = await gateway.execute('channel1', Chaincodes.Info, Functions.CreateAsset, command, String(id), JSON.stringify(body), collection)
		res.status(200).json({ message: "Item added!", success: true, result });
	} catch (error) {
		throw error
	}
}

async function update(res, req, body) {
	try {
		const { id, ...data } = body;
		const command = req.params.command.toLowerCase();
		const collection = Collections[command];

		const result = await gateway.execute('channel1', Chaincodes.Info, Functions.UpdateAsset, command, req.params.id.toLowerCase(), JSON.stringify(data), collection)
		res.status(200).json({ message: "Item updated!", success: true, result });
	} catch (error) {
		throw error
	}
}


async function read(res, req) {
	try {
		let { command, id, collection } = req.params;
		command = command.toLowerCase();
		collection = Collections[command];

		const result = id 
			? await gateway.query('channel1', Chaincodes.Info, Functions.ReadAsset, command, id, collection)
			: await gateway.query('channel1', Chaincodes.Info, Functions.GetAllAssets, command, collection)
		res.status(200).json({ message: "Item retrieved!", success: true, result });
	} catch (error) {
		throw error
	}
}


async function readingsByRange(res, req, body) {
	try {
		const { start_date, end_date, location_id } = req.query;
		const startDate = new Date(start_date);
		const endDate = new Date(end_date);

		// find difference in days
		const difference = endDate.getTime() - startDate.getTime();
		const differenceInDays = difference / (1000 * 3600 * 24);

		// throw error if the difference is more than 30 days
		if (differenceInDays > 30) {
			throw new Error('The start_date - end_date range must not be longer than 30 days.')
		}
		
		const locationSelector = location_id === -1
			? {
				"$or": [
					{ "location_id": null },
					{ "location_id": { "$exists": false } }
				]
			}
			: { "location_id": location_id };
		const queryString = JSON.stringify({
			"selector": {
				"$and": [
					locationSelector,
					{
						"sensor_date": {
							"$gte": start_date,
							"$lte": end_date
						}
					}
				]
			}
		});

		const result = await gateway.query('channel1', Chaincodes.Readings, Functions.ReadingsQuery, queryString, Collections.readings)
		res.status(200).json({ message: "Retrieved readings!", success: true, result });
	} catch (error) {
		throw error
	}
}

async function statsByRange(res, req, body) {
	try {
		const { start_date, end_date, location_id } = req.query;
		const queryString = JSON.stringify({
			"selector": {
				"$and": [
					{ "location_id": location_id },
					{ "date_insert": { "$gte": start_date } },
					{ "date_insert": { "$lte": end_date } },
					{ "total_meters": { "$exists": true } } // differentiate locations with meter stats
				]
			}
		});

		const result = await gateway.query('channel1', Chaincodes.MeterStats, Functions.AssetQuery, queryString, Collections.meterstats)
		res.status(200).json({ message: "Retrieved statistics!", success: true, result });
	} catch (error) {
		throw error
	}
}

async function writeMeterStatuses(res, req, body) {
	try {
		let { command, id } = req.params;
		command = command.toLowerCase();

		if (IDMapper.hasOwnProperty(command)) {
			id = IDMapper[command](req);
		}

		const processedMeterStatus = await gateway.execute('channel1', Chaincodes.ReadingsBridge, Functions.ProcessMeterStatus, JSON.stringify(body), Collections.metertometerstatus)
		const result = await gateway.execute('channel1', Chaincodes.Readings, Functions.CreateAsset, command, String(id), JSON.stringify(processedMeterStatus), Collections.readings)
		res.status(200).json({ message: "Meter status added!", success: true, result });
	} catch (error) {
		throw error
	}
}

async function writeMeterStats(res, req, body) {
	try {
		const meterStatsQuery = JSON.stringify({
			"selector": {
				"date_insert": {
					"$gte": new Date(new Date(body.date).setHours(0, 0, 0, 0)),
					"$lte": new Date(new Date(body.date).setHours(23, 59, 59, 59))
				}
			}
		});

		// check if statistics have been calculated for the specified date
		const stats = await gateway.query('channel1', Chaincodes.MeterStats, Functions.AssetQuery, meterStatsQuery, Collections.meterstats)
		if (stats && stats.length) {
			throw new Error('Statistics have already been calculated for the specified date.')
		}


		const meterStatusesQuery = JSON.stringify({
			"selector": {
				"sensor_date": {
					"$gte": new Date(new Date(body.date).setHours(0, 0, 0, 0)),
					"$lte": new Date(new Date(body.date).setHours(23, 59, 59, 59))
				}
			}
		});

		// get meter statuses for the specified day
		const meterStatuses = await gateway.query('channel1', Chaincodes.Readings, Functions.ReadingsQuery, meterStatusesQuery, Collections.readings)

		// group meter statuses and consumption by location
		const location = {};
		for (let { location_id = null, consumption, meterstatus_id } of meterStatuses) { 
			if (location_id === null) {
				location_id = -1
			}			
			if (!location[location_id]) {
				location[location_id] = { meterStatuses: [], consumption: 0 };
			}
			location[location_id].consumption += consumption;
			location[location_id].meterStatuses.push({ meterstatus_id });
		}

		// write meter stat for each location
		const now = new Date();
		const meterStats = []
		for (const location_id in location) {
			const meterStat = {
				location_id: parseInt(location_id),
				id: now.getTime(),
				date_insert: now,
				total_consumption: location[location_id].consumption,
				total_meters: (await gateway.query('channel1', Chaincodes.ReadingsBridge, Functions.MeterStatusesToMeters, JSON.stringify(location[location_id].meterStatuses), Collections.metertometerstatus)).length
			}
			meterStats.push(await gateway.execute('channel1', Chaincodes.MeterStats, Functions.CreateAsset, 'meterstats', String(meterStat.id), JSON.stringify(meterStat), Collections.meterstats));
		}

		res.status(200).json({ message: "Meter stats added!", success: true, result: meterStats });
	} catch (error) {
		throw error
	}
}

async function validate(command, res, req) {
	const { id } = req.params;

	const result = await gateway.query('channel1', Chaincodes.Info, Functions.ValidateAsset, command, String(id), JSON.stringify(req.body), Collections[command]);
	res.status(200).json({ message: "Item validated!", success: true, result: result });
}