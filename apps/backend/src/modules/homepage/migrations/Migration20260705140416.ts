import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260705140416 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "homepage_setting" ("id" text not null, "hero_title" text not null default 'From Local Farms\\nTo Your Family', "hero_subtitle" text not null default 'Traditional foods made with love, for a healthier and happier tomorrow.', "hero_image_url" text null, "promo_card_1_title" text null, "promo_card_1_url" text null, "promo_card_2_title" text null, "promo_card_2_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_homepage_setting_deleted_at" ON "homepage_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "homepage_setting" cascade;`);
  }

}
