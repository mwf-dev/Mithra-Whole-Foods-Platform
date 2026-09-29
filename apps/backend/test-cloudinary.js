// Quick credential test — run with: node test-cloudinary.js
const { v2: cloudinary } = require('/Users/macbook/Downloads/Library/PROJECTS/Mithra-WholeFoods/node_modules/.pnpm/cloudinary@2.10.0/node_modules/cloudinary')
const fs = require('fs')

// Manually read .env
const env = fs.readFileSync('.env', 'utf8')
  .split('\n')
  .filter(l => l && !l.startsWith('#'))
  .reduce((acc, line) => {
    const idx = line.indexOf('=')
    if (idx === -1) return acc
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    // strip surrounding quotes if present
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1)
    }
    acc[key] = val
    return acc
  }, {})

console.log('Cloud name:', env.CLOUDINARY_CLOUD_NAME)
console.log('API key   :', env.CLOUDINARY_API_KEY)
console.log('API secret:', env.CLOUDINARY_API_SECRET?.slice(0, 5) + '...' + env.CLOUDINARY_API_SECRET?.slice(-3))

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

cloudinary.api.ping()
  .then(result => {
    console.log('\n✅ Cloudinary credentials are VALID!', result)
  })
  .catch(err => {
    console.error('\n❌ Cloudinary credentials INVALID:', err.error?.message || err.message || err)
    console.log('\n👉 Please go to: https://console.cloudinary.com/settings/api-keys')
    console.log('   Copy the API Key and API Secret and update your .env file')
  })
