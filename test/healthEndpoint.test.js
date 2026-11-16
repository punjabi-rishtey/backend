const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const createHealthApp = () => {
  const app = express();
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  return app;
};

const getJson = (path, app) =>
  new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      http
        .get(`http://127.0.0.1:${port}${path}`, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            server.close();
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          });
        })
        .on("error", (error) => {
          server.close();
          reject(error);
        });
    });
  });

const main = async () => {
  const app = createHealthApp();
  const response = await getJson("/health", app);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: "ok" });
  console.log("health endpoint returns cheap static JSON without database access");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});