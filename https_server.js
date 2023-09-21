const fs = require('fs');
const https = require('https');
const swagger = require('./swagger');

// Import the express module
const express = require("express");

const app = express();
const hostname = 'localhost';
const port = 8080;
const key = '12345';

// middleware that handles authorization
const checkAuthorization = (req, res, next) => {
	if (key !== req.headers["authorization"]) {
		return res.status(401).json({ "result": "Unauthorized attempt!", "success": false });
	}
	next();
};

// apply json middleware globally
app.use(express.json())

// set up swagger
swagger(app, port)

// apply authorization middleware globally
app.use(checkAuthorization);

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
 *        description: bad request
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *      '404':
 *        description: not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *      '401':
 *        description: not found
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
 *                result: Unauthorized attempt!
 *                success: false
 */
  // STATIC API URL
app.post('/api', (req, res) => {
	const command = req.body["command"];
	// Check if command parameter exists
	if (typeof command !== 'undefined' && command) {
		// Check for command (case insensitive)
		post_command_controller(command.toLowerCase(), req, res);

	} else {
		res.status(400).json({ "result": "Command parameter is missing!", "success": false });
	}
});


  // DYNAMIC API POST URL
app.post('/api/:command', (req, res) => {
	post_command_controller(req.params.command.toLowerCase(), req, res);
});

// DYNAMIC API GET URL
app.get('/api/:command', (req, res) => {
	get_command_controller(req.params.command.toLowerCase(), req, res);
});

// register error handler
app.use((err, req, res, next) => {
	// format error
	res.status(err.status || 500).json({
		result: err.message,
		success: false,
	});
});

function post_command_controller(command, req, res){
	const commands = {
		'write': write
	};

	command_controller(commands, command, req, res);
}


function get_command_controller(command, req, res) {
	const commands = {
		'read': read
	};

	command_controller(commands, command, req, res);
}

function command_controller(commands, command, req, res) {
	if (!command) {
		return res.status(400).json({ "result": "Command parameter is missing!", "success": false });
	}

	const func = commands[command.toLowerCase()];

	if (func) {
		func(res, req.body);
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
 *        description: bad request
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *      '404':
 *        description: not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *      '401':
 *        description: not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 */
function write(res, body) {
	res.status(200).json({ "result": "Complete!", "success": true, body });
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
 *        description: bad request
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *      '404':
 *        description: not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 *      '401':
 *        description: not found
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                result:
 *                  type: string
 *                success:
 *                  type: boolean
 */
function read(res) {
	res.status(200).json({ "result": "Complete!", "success": true });
}
