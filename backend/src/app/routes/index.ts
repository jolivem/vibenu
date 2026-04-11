import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.routes.js";
import { registerAddressRoutes } from "./address.routes.js";
import { registerLocationRoutes } from "./location.routes.js";

export const registerRoutes = (app: FastifyInstance): void => {
  registerHealthRoutes(app);
  registerAddressRoutes(app);
  registerLocationRoutes(app);
};
