# Final Hosting SQL Report

Generated: 2026-05-14T21:00:03.464Z
Old source dump: `C:\Users\DELL\Downloads\sparocdy_money.sql`
Output SQL: `D:\Claude\SparowVault\sql\FINAL_HOSTING_WITH_DATA.sql`

## Result

- Exported tables: 29
- Export size: 181031 bytes
- Old dump statements imported: 70
- Combined migration statements applied to old DB: 71
- Hot-field transaction rows normalized: 75
- Plan price rows backfilled: 4

## Schema Completion

- Missing tables created: admin_audit_logs
- Missing columns added: none
- Missing indexes added: app_settings.uq_setting_key, app_settings.fk_settings_updated_by, audit_logs.idx_audit_actor_time, audit_logs.idx_audit_action, audit_logs.idx_audit_entity, cloud_collection_rows.uq_collection_entity, cloud_collection_rows.idx_col_user_collection, cloud_collection_rows.idx_col_user_updated, cloud_collection_rows.idx_col_deleted, cloud_users.uq_cu_username, feature_flags_global.uq_feature_key, feature_flags_global.fk_flags_updated_by, login_attempts.uq_login_attempt, login_attempts.idx_login_attempt_locked, payments.idx_pay_user_status, payments.idx_pay_provider_order, payments.idx_pay_provider_payment, payments.idx_pay_paid_at, payments.fk_pay_subscription, plans.uq_plans_code, plan_features.uq_plan_feature, subscriptions.idx_sub_user_status, subscriptions.idx_sub_period_end, subscriptions.idx_sub_provider_sub_id, subscriptions.idx_sub_provider_order_id, subscriptions.fk_sub_plan, udhari_entries.fk_udhari_ent_person, users.uq_users_username, webhook_events.uq_webhook_event_id, webhook_events.idx_webhook_provider_status

## Seed Rows Copied Into Empty New Tables

- none

## Hosting Import Note

Import `sql/FINAL_HOSTING_WITH_DATA.sql` into the hosting database. It contains the old data plus the latest SparowVault tables, columns, indexes, and seed rows for newly introduced empty tables.
