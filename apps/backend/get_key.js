const { Client } = require('pg');

async function getKey() {
  const client = new Client({
    connectionString: "postgres://neondb_owner:npg_NUPG8ym6Dlkb@ep-dry-frost-aou39fd2.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=true"
  });
  
  await client.connect();
  const res = await client.query("SELECT token FROM api_key WHERE type = 'publishable'");
  console.log("KEYS:", res.rows);
  await client.end();
}

getKey();
