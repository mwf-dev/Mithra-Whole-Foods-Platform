import { Module } from "@medusajs/framework/utils"
import ProductBriefService from "./service"

export const PRODUCT_BRIEF_MODULE = "product_brief"

export default Module(PRODUCT_BRIEF_MODULE, {
  service: ProductBriefService,
})
