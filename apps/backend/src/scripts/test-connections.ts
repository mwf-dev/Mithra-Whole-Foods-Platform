import { Client } from 'pg'
import Redis from 'ioredis'
import { loadEnv } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

async function testPostgres() {
  console.log('Testing PostgreSQL connection...')
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  })

  try {
    await client.connect()
    console.log('✅ PostgreSQL connected successfully!')
    const res = await client.query('SELECT NOW()')
    console.log('PostgreSQL time:', res.rows[0].now)
    await client.end()
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err)
  }
}

async function testRedis() {
  console.log('Testing Redis connection...')
  if (!process.env.REDIS_URL) {
    console.log('No REDIS_URL found in env.')
    return
  }

  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1
  })

  try {
    await redis.ping()
    console.log('✅ Redis connected successfully!')
    await redis.quit()
  } catch (err) {
    console.error('❌ Redis connection failed:', err)
  }
}

async function run() {
  await testPostgres()
  console.log('-------------------')
  await testRedis()
  process.exit(0)
}

run()
