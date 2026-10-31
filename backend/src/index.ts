import { app } from "./app.js";
import { env } from "./config/env.js";
import { initElasticsearch } from "./modules/search/elasticsearch.js";

// Initialize Elasticsearch indices
initElasticsearch().catch((err) => {
  console.warn("Elasticsearch initial connection note:", err.message);
});

const server = app.listen(env.PORT, () => {
  console.log(`ReachInbox Backend API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = () => {
  console.log("Shutting down server gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

