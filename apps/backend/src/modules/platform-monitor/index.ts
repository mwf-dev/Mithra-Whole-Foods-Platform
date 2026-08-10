import { Module } from "@medusajs/framework/utils"
import PlatformMonitorService from "./service"

export const PLATFORM_MONITOR_MODULE = "platform_monitor"

export default Module(PLATFORM_MONITOR_MODULE, {
  service: PlatformMonitorService,
})
