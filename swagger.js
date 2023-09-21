const swaggerDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const version = require("./package.json").version;
const OpenApiValidator = require('express-openapi-validator');


const options = {
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
        }
    },
    apis: ["./https_server.js"],
};

const specs = swaggerDoc(options);

function swagger(app, port) {
    // Swagger page
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

    // Docs in JSON format
    app.get("/docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(specs);
    });

    // Setup OpenAPI validation middleware
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

    console.log(`Docs available at https://localhost:${port}/docs`);
}

module.exports = swagger;