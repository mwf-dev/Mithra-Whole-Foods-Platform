import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260823032027 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "product_brief" drop constraint if exists "product_brief_product_id_unique";`);
    this.addSql(`create table if not exists "product_brief" ("id" text not null, "product_id" text not null, "product_handle" text null, "product_title" text null, "status" text check ("status" in ('draft', 'submitted', 'approved')) not null default 'draft', "summary" jsonb null, "slides" jsonb null, "submitted_at" timestamptz null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_brief_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_brief_deleted_at" ON "product_brief" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_brief_product_id_unique" ON "product_brief" ("product_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_brief" cascade;`);
  }

}
