import fs from "fs";
import pg from "pg";

const config = {
  user: "avnadmin",
  password: "AVNS_fSy_vbbvVHn5G7lmtS5",
  host: "blockchain-rehanje1215-ef0f.i.aivencloud.com",
  port: "15788",
  database: "defaultdb",
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync("./ca.pem").toString(),
  },
};

const client = new pg.Client(config);
client.connect(function (err) {
  if (err) throw err;
  client.query("SELECT VERSION()", [], function (err, result) {
    if (err) throw err;

    console.log(result.rows[0]);
    client.end(function (err) {
      if (err) throw err;
    });
  });
});