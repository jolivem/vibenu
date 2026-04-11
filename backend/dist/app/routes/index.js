import { registerHealthRoutes } from "./health.routes.js";
import { registerAddressRoutes } from "./address.routes.js";
import { registerLocationRoutes } from "./location.routes.js";
export const registerRoutes = (app) => {
    registerHealthRoutes(app);
    registerAddressRoutes(app);
    registerLocationRoutes(app);
};
//# sourceMappingURL=index.js.map