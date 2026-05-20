import { HelloRequest } from "shared";
import { loggedProcedure, router } from "../lib/trpc.js";
export const helloRouter = router({
    hello: loggedProcedure.input(HelloRequest).query(({ input }) => {
        return {
            greeting: `Hello ${input?.name ?? "Maha-Perf"}!`,
            project: "learning-loop-app",
            architect: "Jack",
            timestamp: new Date().toISOString(),
            stack: ["Svelte 5", "Vite 8", "Hono", "tRPC", "TypeScript", "ArkType", "Turborepo"],
        };
    }),
    health: loggedProcedure.query(() => {
        return {
            status: "healthy",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }),
});
