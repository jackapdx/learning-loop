import { cors } from "hono/cors";
export const corsMiddleware = cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
});
