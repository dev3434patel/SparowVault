# Reviewed API Entry Inventory

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

40 PHP entry files, 58 method/file pairs, excluding OPTIONS preflight. Methods were corrected against wrapper guards; default GET literals are not treated as allowed methods. Health is GET-guarded. Policies/current is public with optional authenticated handling. Graph reachability does not prove a guard runs for every method. Raw source-inventory.json remains the original static extraction and must not override this reviewed map.

| Path | Methods | Authorization | Controller functions | CSRF helper reachable |
| --- | --- | --- | --- | --- |
| /api/admin/dashboard.php | GET | admin | admin_dashboard | No |
| /api/admin/feature-flags.php | GET, PUT, POST | admin | admin_feature_flags_get, admin_feature_flags_put | No |
| /api/admin/plans.php | GET, POST, PUT | admin | admin_plans_list, admin_plans_upsert | No |
| /api/admin/settings.php | GET, PUT, POST | admin | admin_settings_get, admin_settings_put | No |
| /api/admin/subscriptions.php | GET, POST | admin | admin_subscriptions_list, admin_subscription_action | No |
| /api/admin/users-assign-plan.php | POST | admin | admin_assign_plan | No |
| /api/admin/users-reset-pin.php | POST | admin | admin_reset_user_pin | No |
| /api/admin/users-toggle-active.php | POST | admin | admin_toggle_user_active | No |
| /api/admin/users.php | GET | admin | admin_users_list | No |
| /api/auth/account.php | DELETE, POST | active user | account_delete | No |
| /api/auth/admin-login.php | POST | public (admin-login verifies admin credentials) | cloud_admin_login | No |
| /api/auth/change-pin.php | POST | active user | cloud_change_pin | No |
| /api/auth/data-export.php | POST | active user | account_data_export | No |
| /api/auth/login.php | POST | public (admin-login verifies admin credentials) | cloud_login | No |
| /api/auth/logout.php | POST | active user | cloud_logout | No |
| /api/auth/me.php | GET | active user | cloud_me | No |
| /api/auth/profile.php | PATCH | active user | cloud_profile_update | No |
| /api/auth/register.php | POST | public (admin-login verifies admin credentials) | cloud_register | No |
| /api/auth/reset-pin.php | POST | active user | cloud_reset_pin_with_security | No |
| /api/auth/security-recovery.php | POST | active user | cloud_set_security_recovery | No |
| /api/cloud/entity-item.php | GET, PATCH, DELETE | active user | cloud_entity_get_one, cloud_entity_patch_one, cloud_entity_delete_one | No |
| /api/cloud/entity.php | GET, POST, PATCH, DELETE | active user | cloud_entity_list, cloud_entity_create, cloud_entity_delete_bulk, cloud_entity_patch_many | No |
| /api/cloud/login.php | POST | public (admin-login verifies admin credentials) | cloud_login | No |
| /api/cloud/me.php | GET | active user | cloud_me | No |
| /api/cloud/register.php | POST | public (admin-login verifies admin credentials) | cloud_register | No |
| /api/cloud/sync/pull.php | GET | active user | cloud_sync_pull | No |
| /api/cloud/sync/push.php | POST | active user | cloud_sync_push | Yes on at least one branch; see caveats |
| /api/data/entity-item.php | GET, PATCH, DELETE | active user | cloud_entity_get_one, cloud_entity_patch_one, cloud_entity_delete_one | No |
| /api/data/entity.php | GET, POST, PATCH, DELETE | active user | cloud_entity_list, cloud_entity_create, cloud_entity_delete_bulk, cloud_entity_patch_many | No |
| /api/health.php | GET | public (admin-login verifies admin credentials) | health_check_get | No |
| /api/import/transactions.php | POST | active user | imports_transactions_bulk | No |
| /api/payments/razorpay/webhook.php | POST | public signed provider request | razorpay_webhook | No |
| /api/policies/accept.php | POST | active user | policies_accept | No |
| /api/policies/current.php | GET | public (admin-login verifies admin credentials) | policies_current | No |
| /api/public/config.php | GET | public (admin-login verifies admin credentials) | public_config_get | No |
| /api/subscriptions/cancel.php | POST | active user | subscriptions_cancel | No |
| /api/subscriptions/confirm-payment.php | POST | active user | subscriptions_confirm_payment | No |
| /api/subscriptions/create-order.php | POST | active user | subscriptions_create_order | No |
| /api/subscriptions/my.php | GET | active user | subscriptions_my | No |
| /api/subscriptions/plans.php | GET | public (admin-login verifies admin credentials) | subscriptions_list_plans | No |

