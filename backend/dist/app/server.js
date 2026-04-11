import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerRoutes } from "./routes/index.js";
import { appConfig } from "../shared/infrastructure/config/app-config.js";
export const buildServer = () => {
    const app = Fastify({ logger: false });
    void app.register(cors, {
        origin: appConfig.frontendOrigin,
    });
    registerRoutes(app);
    return app;
};
//# sourceMappingURL=server.js.map