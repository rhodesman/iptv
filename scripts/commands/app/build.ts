import { buildCatalog, writeCatalog } from './catalog'

const CATALOG_PATH = process.env.CATALOG_PATH || 'app/catalog.json'

async function main() {
  const catalog = await buildCatalog()
  await writeCatalog(CATALOG_PATH, catalog)
   
  console.log(`wrote ${catalog.channels.length} channels to ${CATALOG_PATH}`)
}

main()
