import { initTRPC } from "@trpc/server";
import { createLogger } from "shared";

const logger = createLogger("trpc");

const t = initTRPC.create({
  isDev: process.env.NODE_ENV === "development",
});

export const publicProcedure = t.procedure;
export const router = t.router;
export const middleware = t.middleware;

export const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  if (result.ok) {
    logger.info(`${path} ${type} ✅ ${duration}ms`);
  } else {
    logger.error(`${path} ${type} ❌ ${duration}ms`, result.error);
  }

  return result;
});

export const loggedProcedure = publicProcedure.use(loggerMiddleware);
