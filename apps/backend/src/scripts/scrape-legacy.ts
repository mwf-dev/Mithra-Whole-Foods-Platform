import * as cheerio from "cheerio"
import * as fs from "fs/promises"
import * as path from "path"

const BASE_URL = "https://mithrawholefoods.com"

async function fetchHtml(url: string) {
  console.log(`Fetching: ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`)
  return cheerio.load(await res.text())
}

async function scrape() {
  console.log("Starting scraper...")
  const $ = await fetchHtml(BASE_URL)

  const categories: { name: string; url: string }[] = []
  
  // Extract categories from the navbar
  $("#navbar-menu .dropdown-item").each((_, el) => {
    const name = $(el).text().trim()
    const url = $(el).attr("href")
    if (name && url && name !== "All Items") {
      categories.push({ name, url })
    }
  })

  console.log(`Found ${categories.length} categories.`)

  const productsMap = new Map<string, any>()

  for (const category of categories) {
    const categoryUrl = `${category.url.replace(/&amp;/g, '&')}&limit=100`
    const $cat = await fetchHtml(categoryUrl)

    $cat("#product-list .product-thumb").each((_, el) => {
      const productUrl = $cat(el).find(".image a").attr("href")?.replace(/&amp;/g, '&')
      
      if (productUrl) {
        // Normalize URL by removing session/path tokens to avoid duplicates
        const normalizedUrl = productUrl.split("&path=")[0]
        
        if (!productsMap.has(normalizedUrl)) {
          productsMap.set(normalizedUrl, {
            url: normalizedUrl,
            categories: [category.name]
          })
        } else {
          // If product exists in multiple categories, add it
          const p = productsMap.get(normalizedUrl)
          if (!p.categories.includes(category.name)) {
            p.categories.push(category.name)
          }
        }
      }
    })
  }

  console.log(`Found ${productsMap.size} unique products. Fetching details...`)
  const products = Array.from(productsMap.values())

  for (const product of products) {
    try {
      const $prod = await fetchHtml(product.url)
      
      product.title = $prod("h1").text().trim()
      
      const priceText = $prod(".price-new").text().trim() || $prod("ul.list-unstyled h2").text().trim()
      product.price = parseFloat(priceText.replace(/[^0-9.]/g, ""))

      // Extract brand
      $prod("ul.list-unstyled li").each((_, el) => {
        const text = $prod(el).text()
        if (text.includes("Brand:")) {
          product.brand = $prod(el).find("a").text().trim() || text.replace("Brand:", "").trim()
        }
      })

      // Extract description HTML
      product.description = $prod("#tab-description").html()?.trim() || ""

      // Extract high-res image
      const imgUrl = $prod(".magnific-popup a").attr("href")
      if (imgUrl) {
        product.imageUrl = imgUrl.startsWith("http") ? imgUrl : `${BASE_URL}/${imgUrl}`
      }

      console.log(`✅ Scraped: ${product.title}`)
      
      // Delay to avoid hitting rate limits
      await new Promise(r => setTimeout(r, 500))
    } catch (e) {
      console.error(`❌ Error scraping ${product.url}:`, e)
    }
  }

  const outputPath = path.join(__dirname, "legacy_data.json")
  await fs.writeFile(outputPath, JSON.stringify(products, null, 2))
  console.log(`\n🎉 Successfully saved ${products.length} products to ${outputPath}`)
}

scrape().catch(console.error)
