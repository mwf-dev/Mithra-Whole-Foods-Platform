import { MedusaService } from "@medusajs/framework/utils"
import { HomepageSetting } from "./models/homepage"

class HomepageService extends MedusaService({
  HomepageSetting,
}) {}

export default HomepageService
