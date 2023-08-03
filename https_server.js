const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

// Import the express module
const express = require("express");



const app = express();

app.use(express.json())


const hostname = 'localhost';
const port = 8080;
const key = '12345';

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
  
  
  // STATIC API URL
app.post('/api', express.json(), (req, res) => {
  
  // Check if request is json format
  if (req.is('application/json')) {
    // Get the number of post parameters passed
    const body_length = Object.keys(req.body).length;
    // Check if the sender provided the right key
    if (key === req.headers["authorization"]) {
		const command = req.body["command"];
		// Check if command parameter exists
		if (typeof command !== 'undefined' && command ) {
			// Check for command (case insensitive)
			command_controller(command.toLowerCase(), res, req.body, body_length);					
		
		}
		else {
			res.status(400).json({ "result": "Command parameter is missing!", "success": false });
		}
    
    }
    else {
	  res.status(401).json({ "result": "Unauthorized attempt!", "success": false });
      
    }
    
  }
  else {
	res.status(400).json({ "result": "JSON syntax error!", "success": false });
  }
  
  
});


  // DYNAMIC API URL
app.post('/api/:command', express.json(), (req, res) => {
  
  // Check if request is json format
  if (req.is('application/json')) {
    // Get the number of post parameters passed
    const body_length = Object.keys(req.body).length;
    // Check if the sender provided the right key
    if (key === req.headers["authorization"]) {
		const command = req.params.command;
		// Check if command parameter exists
		if (typeof command !== 'undefined' && command ) {
			// Check for command (case insensitive)
			command_controller(command.toLowerCase(), res, req.body, (body_length+1));				
		
		}
		else {
			res.status(400).json({ "result": "Command parameter is missing!", "success": false });
		}
    
    }
    else {
	  res.status(401).json({ "result": "Unauthorized attempt!", "success": false });
      
    }
    
  }
  else {
	res.status(400).json({ "result": "JSON syntax error!", "success": false });
  }
  
  
});


function command_controller(command, res, req_body, body_length){

	switch(command) {
	  case 'write':
		write(res, req_body, body_length);
		break;
	  case 'read':
		read(res, req_body, body_length);
		break;
	  default:
		res.status(404).json({ "result": "Command not found!", "success": false });
	}


}


function write(res, parameters, parameters_length) {
	// Check the number of parameters
	if (parameters_length != 3) {
		res.status(400).json({ "result": "Wrong number of parameters!", "success": false });
		return;
	}
	// Check if parameters names...

	res.status(200).json({ "result": "Complete!", "success": true });
}


function read(res, parameters, parameters_length) {
	// Check the number of parameters
	if (parameters_length != 1) {
		res.status(400).json({ "result": "Wrong number of parameters!", "success": false });
		return;
	}
	// Check if parameters names...

	res.status(200).json({ "result": "Complete!", "success": true });

}
