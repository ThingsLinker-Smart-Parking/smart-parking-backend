import "reflect-metadata";
import { DataSource } from "typeorm";
import * as entities from "./models";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const isCompiled = __filename.endsWith(".js");
const migrationsPath = isCompiled
  ? path.join(__dirname, "database", "migrations", "*.js")
  : path.join("src", "database", "migrations", "*.ts");

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.NODE_ENV === 'development', // Enabled for development to fix schema issues
  logging: process.env.DB_LOGGING === "true",
  entities: Object.values(entities),
  migrations: [migrationsPath],
  migrationsTableName: "migrations",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  extra: {
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || "10"),
    min: parseInt(process.env.DB_POOL_MIN || "1"),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || "10000",
    ),
  },
});
