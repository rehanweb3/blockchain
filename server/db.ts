import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caPath = path.resolve(process.cwd(), "ca.pem");
const ca = fs.readFileSync(caPath).toString();

// ✅ Create PostgreSQL pool with SSL using discrete config (no connection string)
export const pool = new Pool({
  host: "blockchain-rehanje1215-ef0f.i.aivencloud.com",
  port: 15788,
  user: "avnadmin",
  password: "AVNS_fSy_vbbvVHn5G7lmtS5",
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca,
  },
});

export const db = drizzle(pool, { schema });

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL (SSL enabled)"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));