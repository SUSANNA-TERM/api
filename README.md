# SUSANNA API

The SUSANNA API provides functionalities for managing and retrieving information related to water meters within a secure Hyperledger Fabric network. It is designed to handle tasks such as creating meters, fetching meter data, and performing queries based on date ranges and locations.

This README provides documentation for developers on how to use the SUSANNA API.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Installation](#installation)
- [Usage](#usage)
  - [Endpoints](#endpoints)
  - [Authentication](#authentication)
  - [Request Examples](#request-examples)
- [Error Handling](#error-handling)
- [License](#license)

## Getting Started

### Prerequisites

To use the SUSANNA API, you need:

- Node.js and npm installed
- Access to a Hyperledger Fabric network

<!-- mention specific versions  -->

### Configuration

Before starting the API, create a config.json file in the `config/` directory with the following structure:

```
{
    "server": {
        "hostname": "<e.g. localhost>",
        "port": "<e.g. 8080>"
    },
    "apiKeys": {
        "<key1>": "<identifier-for-key1>",
        "<key2>": "<identifier-for-key2>",
        ...
    },
    "fabric": {
        "grpcAddress": "<grpc-address-of-peer-filepath>",
        "mspId": "<msp-id>",
        "clientCredentials": "<client-credentials-filepath>",
        "clientPrivateKey": "<client-private-key-filepath>",
        "clientTlsCert": "<client-tls-certificate-filepath>",
        "peerPrivateKey": "<peer-private-key-filepath>",
        "certChain": "<chain-certificate-filepath>"
    }
}
```

This configuration file includes settings for the server, API keys, and Hyperledger Fabric connection details.

### Installation

1. Clone the repository with `git clone https://github.com/SUSANNA-TERM/api.git`
2. Install dependencies with `npm install`
3. Start the API with `npm start` or with `npm run serve` to watch for file changes 

## Usage

### Endpoints

For a list of the available resources and their endpoints, see the swagger hosted on https://ledger1.drosatus.eu:8888/docs or alternatively run the app with `npm start` and navigate to https://localhost:8888

Example:
- POST /api/meters: Create a new water meter.
- GET /api/meters/:id: Retrieve information about a specific water meter.
- GET /api/meters: Retrieve a list of all water meters.

### Authentication

The SUSANNA API uses API key authentication for secure access to its resources. API keys are required in the `authorization` header of each request to protected endpoints.

API key authentication ensures controlled and secure access to different parts of the API based on predefined roles.

**Access Configuration**

Access permissions for each API key are configured in `config/access.json`.

For example, certain keys may have read and write access to `/api/Meters`.

```
[
    {
        "scope": ["zitsa"],
        "resource": "/api/Meters",
        "access": ["read", "write"]
    },
    // Other configurations...
]

```
### Request Examples

Create a new water meter:

```
curl -X 'POST' \
  'https://localhost:8888/api/Meters' \
  -H 'accept: application/json' \
  -H 'authorization: <your-api-key>' \
  -H 'Content-Type: application/json' \
  -d '{
  "meter_id": 0,
  "id": "string",
  "type": "string",
  "metertype_id": 0,
  "type_id": 0,
  "mote": "string",
  "barcode": "string",
  "consumer": "string",
  "provision": "string",
  "lat": "string",
  "lng": "string",
  "address": "string",
  "description": "string",
  "location_id": 0,
  "address_name": "string",
  "in_use": true
}'
```

Retrieve information about a specific water meter:
```
curl -X 'GET' \
  'https://localhost:8888/api/Meters/0' \
  -H 'accept: application/json' \
  -H 'authorization: <your-api-key>'
```

# Error Handling

The API provides detailed error messages to assist developers in identifying and resolving issues.

Example: 

Error 500: Internal Server Error
```
{
  "result": "Gateway not connected.",
  "success": false
}
```

# License

This project is licensed under the ...
