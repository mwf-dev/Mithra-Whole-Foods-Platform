import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260709003443 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "homepage_setting" add column if not exists "announcement_text" text null, add column if not exists "footer_tagline" text null, add column if not exists "hero_banners" jsonb null, add column if not exists "offer_cards" jsonb null, add column if not exists "category_tiles" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "homepage_setting" drop column if exists "announcement_text", drop column if exists "footer_tagline", drop column if exists "hero_banners", drop column if exists "offer_cards", drop column if exists "category_tiles";`);
  }

}
