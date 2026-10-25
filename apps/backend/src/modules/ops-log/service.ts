import { MedusaService } from "@medusajs/framework/utils"
import { OpsLogEvent } from "./models/ops-log-event"

class OpsLogService extends MedusaService({
  OpsLogEvent,
}) {}

export default OpsLogService
