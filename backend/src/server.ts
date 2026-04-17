import { buildServer } from "./app/server.js";
import { appConfig } from "./shared/infrastructure/config/app-config.js";
import { logger } from "./shared/infrastructure/logger/logger.js";

const start = async (): Promise<void> => {
  const server = buildServer();

  try {
    await server.listen({ port: appConfig.port, host: appConfig.host });
    logger.info(`Backend ClairImmo lancé sur http://${appConfig.host}:${appConfig.port}`);
  } catch (error) {
    logger.error("Impossible de démarrer le backend", error);
    process.exit(1);
  }
};

void start();
