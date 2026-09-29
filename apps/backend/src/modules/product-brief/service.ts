import { MedusaService } from "@medusajs/framework/utils"
import { ProductBrief } from "./models/product-brief"

class ProductBriefService extends MedusaService({
  ProductBrief,
}) {}

export default ProductBriefService
