import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261002115331 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "homepage_setting" add column if not exists "welcome_cards" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "homepage_setting" drop column if exists "welcome_cards";`);
  }

}
