import { router } from "../lib/trpc.js";
import { helloRouter } from "./hello.router.js";
import { learnRouter } from "./learn.router.js";

export const appRouter = router({
  hello: helloRouter,
  learn: learnRouter,
});

export type AppRouter = typeof appRouter;
