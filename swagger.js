const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Punjabi Rishtey Matrimony API",
      version: "1.0.0",
      description: "API documentation for user and admin panel",
    },
    servers: [
      {
        url: "http://localhost:8080",
        description: "Local server",
      },
    ],
  },
  apis: ["./routes/*.js"], // Ensures all routes in /routes folder are picked up
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ✅ Add JSON route for exporting API documentation
  app.get("/api-docs-json", (req, res) => {
    res.json(swaggerSpec);
  });

  console.log("📄 Swagger Docs available at http://localhost:8080/api-docs");
  console.log("📄 Swagger JSON available at http://localhost:8080/api-docs-json");
};

module.exports = swaggerDocs;
