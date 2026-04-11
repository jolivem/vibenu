import { z } from "zod";
import { makeLocationAnalysisController } from "../controllers/location-analysis.controller.js";
const analyzeQuerySchema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    label: z.string().trim().min(1).optional(),
    city: z.string().trim().optional(),
    postcode: z.string().trim().optional(),
});
export const registerLocationRoutes = (app) => {
    const controller = makeLocationAnalysisController();
    app.get("/api/location/analyze", async (request, reply) => {
        const parsed = analyzeQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send({ message: "Paramètres d'analyse invalides." });
        }
        const result = await controller.handle(parsed.data);
        return reply.send(result);
    });
};
//# sourceMappingURL=location.routes.js.map