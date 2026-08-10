import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260808070839 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "platform_connection" drop constraint if exists "platform_connection_provider_unique";`);
    this.addSql(`alter table if exists "platform_budget" drop constraint if exists "platform_budget_provider_metric_key_unique";`);
    this.addSql(`create table if not exists "platform_alert" ("id" text not null, "fingerprint" text not null, "provider" text not null, "metric_key" text not null, "severity" text check ("severity" in ('warning', 'critical')) not null default 'warning', "message" text not null, "context" jsonb not null default '{}', "triggered_at" timestamptz not null, "last_seen_at" timestamptz not null, "resolved_at" timestamptz null, "notified_at" timestamptz null, "acknowledged_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "platform_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_alert_deleted_at" ON "platform_alert" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_alert_fingerprint" ON "platform_alert" ("fingerprint") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_alert_provider_resolved_at" ON "platform_alert" ("provider", "resolved_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "platform_budget" ("id" text not null, "provider" text not null, "metric_key" text not null, "limit_value" integer not null, "threshold_pct" integer not null default 90, "enabled" boolean not null default true, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "platform_budget_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_budget_deleted_at" ON "platform_budget" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_budget_provider_metric_key_unique" ON "platform_budget" ("provider", "metric_key") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "platform_connection" ("id" text not null, "provider" text not null, "label" text not null, "credentials_encrypted" text null, "settings" jsonb not null default '{}', "enabled" boolean not null default true, "last_status" text not null default 'unconfigured', "last_status_detail" text null, "last_checked_at" timestamptz null, "last_collected_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "platform_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_connection_deleted_at" ON "platform_connection" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_connection_provider_unique" ON "platform_connection" ("provider") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "platform_usage_snapshot" ("id" text not null, "provider" text not null, "captured_at" timestamptz not null, "cycle_start" timestamptz null, "cycle_end" timestamptz null, "metrics" jsonb not null default '[]', "cost_estimate_usd" integer null, "status" text not null default 'ok', "error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "platform_usage_snapshot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_usage_snapshot_deleted_at" ON "platform_usage_snapshot" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_platform_usage_snapshot_provider_captured_at" ON "platform_usage_snapshot" ("provider", "captured_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "platform_alert" cascade;`);

    this.addSql(`drop table if exists "platform_budget" cascade;`);

    this.addSql(`drop table if exists "platform_connection" cascade;`);

    this.addSql(`drop table if exists "platform_usage_snapshot" cascade;`);
  }

}
