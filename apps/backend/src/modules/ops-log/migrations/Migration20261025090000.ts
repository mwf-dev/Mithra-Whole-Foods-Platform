import { Migration } from "@medusajs/framework/mikro-orm/migrations"

// Hand-written to match the shape `medusa db:generate` produces for the
// OpsLogEvent model (modeled on product-review's generated migration); it must
// stay in sync with `.snapshot-ops-log.json`.
export class Migration20261025090000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "ops_log_event" ("id" text not null, "kind" text check ("kind" in ('email', 'webhook', 'label')) not null, "source" text not null, "status" text check ("status" in ('ok', 'failed')) not null, "order_id" text null, "email" text null, "reference" text null, "detail" text null, "payload" jsonb null, "retried_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ops_log_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_ops_log_event_deleted_at" ON "ops_log_event" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_ops_log_event_created_at" ON "ops_log_event" ("created_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_ops_log_event_status" ON "ops_log_event" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_ops_log_event_order_id" ON "ops_log_event" ("order_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "ops_log_event" cascade;`)
  }
}
