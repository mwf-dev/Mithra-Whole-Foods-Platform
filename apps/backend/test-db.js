const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://neondb_owner:npg_NUPG8ym6Dlkb@ep-dry-frost-aou39fd2.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});
client.connect()
  .then(() => {
    console.log('Successfully connected to Neon with sslmode=require!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(err => {
    console.error('Connection error', err.stack);
    client.end();
  });
