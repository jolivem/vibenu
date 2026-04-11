import { z } from "zod";
import { makeAddressSearchController } from "../controllers/address-search.controller.js";
const searchQuerySchema = z.object({
    q: z.string().trim().min(3),
});
export const registerAddressRoutes = (app) => {
    const controller = makeAddressSearchController();
    app.get("/api/address/search", async (request, reply) => {
        const parsed = searchQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send({ message: "Le paramètre q doit contenir au moins 3 caractères." });
        }
        const result = await controller.handle(parsed.data.q);
        return reply.send(result);
    });
};
//# sourceMappingURL=address.routes.js.map