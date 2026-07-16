import { Module } from "@medusajs/framework/utils"
import ProductReviewService from "./service"

export const PRODUCT_REVIEW_MODULE = "product_review"

export default Module(PRODUCT_REVIEW_MODULE, {
  service: ProductReviewService,
})
