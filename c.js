import fs from "fs";
import pg from "pg";
import bcrypt from "bcrypt";

const { Client } = pg;

// ✅ Database Config (Aiven)
const config = {
  user: "avnadmin",
  password: "AVNS_fSy_vbbvVHn5G7lmtS5",
  host: "blockchain-rehanje1215-ef0f.i.aivencloud.com",
  port: 15788,
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("./ca.pem", "utf8"),
  },
};

async function addAdmin() {
  const client = new Client(config);

  // admin data
  const email = "asifzardari447@gmail.com";
  const password = "Asifzardari4477";
  const role = "admin";

  try {
    console.log("🔗 Connecting to PostgreSQL...");
    await client.connect();

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // make sure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // insert admin record
    const result = await client.query(
      `
      INSERT INTO admin_users (email, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, role;
      `,
      [email, passwordHash, role]
    );

    if (result.rows.length > 0) {
      console.log("✅ Admin user created successfully:");
      console.log(result.rows[0]);
    } else {
      console.log("⚠️ Admin already exists, no new record inserted.");
    }
  } catch (err) {
    console.error("❌ Error adding admin:", err.message);
  } finally {
    await client.end();
    console.log("🔒 Connection closed.");
  }
}

addAdmin();
