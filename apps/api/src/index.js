import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { logger as honoLogger } from "hono/logger";
import { createLogger } from "shared";
import { corsMiddleware } from "./middleware/cors.js";
import { appRouter } from "./router/index.js";
const logger = createLogger("api");
const app = new Hono();
// Custom logger middleware for Hono requests
app.use("*", honoLogger((str) => {
    logger.info(str);
}));
// Health check endpoint
app.get("/health", (c) => {
    return c.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "maha-perf-api",
    });
});
// tRPC endpoint
app.use("/trpc/*", corsMiddleware);
app.all("/trpc/*", (c) => {
    return fetchRequestHandler({
        endpoint: "/trpc",
        req: c.req.raw,
        router: appRouter,
        createContext: () => ({}),
    });
});
// Serve the API using Bun.serve() — Bun natively manages server lifecycle
// in --watch mode, automatically closing the previous instance before
// re-executing, so there are no port collisions on reload.
const port = parseInt(process.env.PORT || "3000");
Bun.serve({
    fetch: app.fetch,
    port,
});
logger.info(`Maha-Perf API server running on port ${port}`);
logger.info(`tRPC playground available at http://localhost:${port}/trpc`);
logger.info(`Health check at http://localhost:${port}/health`);
// Export app for testing or programmatic use
export { app };
