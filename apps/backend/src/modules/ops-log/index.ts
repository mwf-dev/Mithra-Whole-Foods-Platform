import { Module } from "@medusajs/framework/utils"
import OpsLogService from "./service"

export const OPS_LOG_MODULE = "ops_log"

export default Module(OPS_LOG_MODULE, {
  service: OpsLogService,
})
