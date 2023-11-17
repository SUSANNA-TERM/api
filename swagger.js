const swaggerDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const version = require("./package.json").version;
const OpenApiValidator = require('express-openapi-validator');
const config = require('./config/config.json');

const options = {
    failOnErrors: true,
    definition: {
        openapi: "3.0.0",
        info: {
            version,
            title: "API Docs",
            description: "...",
            contact: {
                name: "ATHENA RC",
                url: "https://www.athenarc.gr/",
                email: "info@athena-innovation.gr",
            },
        },
        components: {
            responses: {
                Success: {
                    description: "OK",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: { type: "string" },
                                    success: { type: "boolean" },
                                    result: {
                                        oneOf: [
                                            {
                                                type: "object"
                                            },
                                            {
                                                type: "array",
                                                items: { type: "object" }
                                            }
                                        ]
                                    }
                                },
                                example: {
                                    message: "completed!",
                                    success: true,
                                    result: {
                                        id: 1,
                                        data: '...'
                                    }
                                }
                            }
                        }
                    }
                },
                BadRequest: {
                    description: "bad request",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    result: { type: "string" },
                                    success: { type: "boolean" },
                                },
                                example: {
                                    result: "Bad request!",
                                    success: false,
                                }
                            }
                        }
                    }
                },
                NotFound: {
                    description: "not found",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    result: { type: "string" },
                                    success: { type: "boolean" },
                                },
                                example: {
                                    result: "Not found!",
                                    success: false,
                                }
                            }
                        }
                    }
                },
                Unauthorized: {
                    description: "unauthorized attempt",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    result: { type: "string" },
                                    success: { type: "boolean" },
                                },
                                example: {
                                    result: "Unauthorized attempt!",
                                    success: false,
                                }
                            }
                        }
                    }
                },
                Forbidden: {
                    description: "forbidden",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    result: { type: "string" },
                                    success: { type: "boolean" },
                                },
                                example: {
                                    result: "Forbidden!",
                                    success: false,
                                }
                            }
                        }
                    }
                }
            },
            securitySchemes: {
                ApiKeyAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "authorization"
                }
            }
        },
        security: [
            {
                ApiKeyAuth: []
            }
        ],
        servers: [
            {
                url: `https://${config.server.hostname}:${config.server.port}`,
                description: "Test server"
            },
            {
                url: "https://localhost:8888",
                description: "Localhost server"
            }
        ]
    },
    apis: ["api-docs/**/*.yaml", "./https_server.js"],
};

const specs = swaggerDoc(options);

// Serve documentation
function swagger(app, port) {
    // Swagger page
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

    // Docs in JSON format
    app.get("/docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(specs);
    });

    console.log(`Docs available at https://localhost:${port}/docs`);
}

// Setup OpenAPI validation middleware
function openAPIValidator(app) {
    app.use(
        OpenApiValidator.middleware({
            apiSpec: specs,
            validateApiSpec: true,
            validateRequests: {
                removeAdditional: 'all',
            },
            validateResponses: true,
        }),
    );
}

module.exports = {
    swagger,
    openAPIValidator
};
