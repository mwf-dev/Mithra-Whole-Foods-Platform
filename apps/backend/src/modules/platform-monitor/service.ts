import { MedusaService } from "@medusajs/framework/utils"
import { PlatformConnection } from "./models/platform-connection"
import { UsageSnapshot } from "./models/usage-snapshot"
import { PlatformBudget } from "./models/platform-budget"
import { PlatformAlert } from "./models/platform-alert"

class PlatformMonitorService extends MedusaService({
  PlatformConnection,
  UsageSnapshot,
  PlatformBudget,
  PlatformAlert,
}) {}

export default PlatformMonitorService
