import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260825073700 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_brief" add column if not exists "origin" text check ("origin" in ('catalog', 'client')) not null default 'catalog', add column if not exists "archived_at" timestamptz null, add column if not exists "archive_reason" text null, add column if not exists "archived_by" text null, add column if not exists "proposal" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "product_brief" drop column if exists "origin", drop column if exists "archived_at", drop column if exists "archive_reason", drop column if exists "archived_by", drop column if exists "proposal";`);
  }

}
