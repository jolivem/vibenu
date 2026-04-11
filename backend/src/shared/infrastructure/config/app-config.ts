import dotenv from "dotenv";

dotenv.config();

export const appConfig = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
} as const;
