import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { EasyshipFulfillmentService } from "./services/easyship-fulfillment"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [EasyshipFulfillmentService],
})
