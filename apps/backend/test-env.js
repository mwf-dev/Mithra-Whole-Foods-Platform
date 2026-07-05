const { loadEnv } = require('@medusajs/framework/utils');
console.log('CWD:', process.cwd());
loadEnv('development', process.cwd());
console.log('DATABASE_URL:', process.env.DATABASE_URL);
