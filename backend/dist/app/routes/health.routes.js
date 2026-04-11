export const registerHealthRoutes = (app) => {
    app.get("/health", async () => ({ status: "ok", service: "bienvu-backend" }));
};
//# sourceMappingURL=health.routes.js.map