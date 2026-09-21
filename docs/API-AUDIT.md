# API Audit

## Update - 11 September 2026

Current endpoint results are in [API-AUDIT-2026-09-11.md](API-AUDIT-2026-09-11.md) and the [fresh full report](FULL-PROJECT-AUDIT-2026-09-11.md). Earlier findings below are preserved as historical evidence, not current pass/fail claims.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Surface and architecture

40 PHP entry files and 58 method/file pairs (OPTIONS excluded). Frontend cloud/data aliases share controllers. The extensionless legacy cloud routes add path aliases, not independent business implementations. No agency invoice/quotation/client/project/partner/document/close/approval API exists.

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

## Common contracts and boundaries

- JSON success commonly uses `{ok:true,data:...}`; errors use `{ok:false,error:...,code?:...}` and request metadata. Exact fields vary by controller. No complete formal OpenAPI specification was found.
- Active-user authorization resolves the JWT subject and database user; caller-supplied userId does not become the SQL tenant. Existing API isolation checks passed. Admin denial incorrectly maps to 500 in some wrappers (B33).
- Generic list/get/create/patch/delete write JSON in cloud_collection_rows. Transactions also drive SQL financial_events/effects through helpers; failure/atomicity must be fixed (B02-B05).
- Body limits exist: 64 KiB per encoded row, 1 MiB generic entity JSON and 4 MiB sync push. This does not impose a browser workbook parse size/time budget.
- Transaction money, enum and required-reference-string checks exist. They do not validate reference existence (B37); other collection schemas are not fully enforced (B14).
- Most entity/admin writes do not require per-action PIN. PIN change requires currentPin; account data-export/delete require PIN re-entry; recovery replacement currently bypasses that protection (B09).
- SQL/user/admin audit helpers exist but are not a complete guaranteed transactional audit of every endpoint. Client-writable auditLogs must not be used as authoritative evidence.
- CSRF is enforced on sync push, but not consistently across cookie mutations. CORS and SameSite behavior must be assessed together on the real deployment; a forged-Origin Node request alone is not a browser attack proof.
- Rate-limit guards exist in auth/admin/account/billing flows; forwarded-IP trust and recovery/change endpoints remain gaps.

## GET /api/admin/dashboard.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/admin/dashboard.php |
| Source / implementation | [api/admin/dashboard.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/dashboard.php>); [php/controllers/admin.php:19](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:19>) |
| Purpose | admin_dashboard |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / PUT / POST /api/admin/feature-flags.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, PUT, POST /api/admin/feature-flags.php |
| Source / implementation | [api/admin/feature-flags.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/feature-flags.php>); [php/controllers/admin.php:112](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:112>); [php/controllers/admin.php:118](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:118>) |
| Purpose | admin_feature_flags_get, admin_feature_flags_put |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / POST / PUT /api/admin/plans.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, POST, PUT /api/admin/plans.php |
| Source / implementation | [api/admin/plans.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/plans.php>); [php/controllers/admin.php:43](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:43>); [php/controllers/admin.php:52](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:52>) |
| Purpose | admin_plans_list, admin_plans_upsert |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | id, price_inr, billing_interval, description, trial_days, is_active |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / PUT / POST /api/admin/settings.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, PUT, POST /api/admin/settings.php |
| Source / implementation | [api/admin/settings.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/settings.php>); [php/controllers/admin.php:85](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:85>); [php/controllers/admin.php:91](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:91>) |
| Purpose | admin_settings_get, admin_settings_put |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("No settings provided", 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / POST /api/admin/subscriptions.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, POST /api/admin/subscriptions.php |
| Source / implementation | [api/admin/subscriptions.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/subscriptions.php>); [php/controllers/admin.php:169](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:169>); [php/controllers/admin.php:216](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:216>) |
| Purpose | admin_subscriptions_list, admin_subscription_action |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | subscriptionId, action, days, reason |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("subscriptionId and valid action are required", 422, "VALIDATION_ERROR"); json_error("days must be between 1 and 366", 422, "VALIDATION_ERROR"); json_error("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/admin/users-assign-plan.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/admin/users-assign-plan.php |
| Source / implementation | [api/admin/users-assign-plan.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/users-assign-plan.php>); [php/controllers/admin.php:339](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:339>) |
| Purpose | admin_assign_plan |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | userId, planId |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error("userId is required", 422, "VALIDATION_ERROR"); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("planId is required", 422, "VALIDATION_ERROR"); json_error("User not found", 404, "USER_NOT_FOUND"); json_error("Plan not found", 404, "PLAN_NOT_FOUND"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status); json_error("Request body too large", 413, "PAYLOAD_TOO_LARGE"); json_error("Invalid JSON payload", 400, "INVALID_JSON") |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/admin/users-reset-pin.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/admin/users-reset-pin.php |
| Source / implementation | [api/admin/users-reset-pin.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/users-reset-pin.php>); [php/controllers/admin.php:290](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:290>) |
| Purpose | admin_reset_user_pin |
| Required role | admin |
| PIN requirement | Security answer plus active session, not current PIN. |
| Request body field references | userId, newPin |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error("userId and newPin are required", 422, "VALIDATION_ERROR"); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("userId is required", 422, "VALIDATION_ERROR"); json_error($pinError, 422, "VALIDATION_ERROR"); json_error("User not found", 404, "USER_NOT_FOUND"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status); json_error("Request body too large", 413, "PAYLOAD_TOO_LARGE"); json_error("Invalid JSON payload", 400, "INVALID_JSON") |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/admin/users-toggle-active.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/admin/users-toggle-active.php |
| Source / implementation | [api/admin/users-toggle-active.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/users-toggle-active.php>); [php/controllers/admin.php:272](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:272>) |
| Purpose | admin_toggle_user_active |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | userId |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error("userId is required", 422, "VALIDATION_ERROR"); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("You cannot deactivate your own admin account", 409, "SELF_TOGGLE_BLOCKED"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status); json_error("Request body too large", 413, "PAYLOAD_TOO_LARGE"); json_error("Invalid JSON payload", 400, "INVALID_JSON") |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/admin/users.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/admin/users.php |
| Source / implementation | [api/admin/users.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/users.php>); [php/controllers/admin.php:134](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/admin.php:134>) |
| Purpose | admin_users_list |
| Required role | admin |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, plans, plan_features, subscriptions, feature_flags, app_settings, admin_audit_logs (depends on operation) |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: admin; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B08, B10, B33. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## DELETE / POST /api/auth/account.php

| Audit item | Finding |
| --- | --- |
| Method and path | DELETE, POST /api/auth/account.php |
| Source / implementation | [api/auth/account.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/account.php>); [php/controllers/account.php:162](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/account.php:162>) |
| Purpose | account_delete |
| Required role | active user |
| PIN requirement | PIN re-entry required. |
| Request body field references | reason |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | audit_log_action, user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Use DELETE (or POST) with { pin } in the body", 405, "METHOD_NOT_ALLOWED"); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Unauthorized", 401, "UNAUTHORIZED"); json_error("PIN re-entry required", 401, "PIN_REQUIRED"); json_error("Account already deleted", 409, "ALREADY_DELETED"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/account-endpoints-e2e.mjs, tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/admin-login.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/admin-login.php |
| Source / implementation | [api/auth/admin-login.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/admin-login.php>); [php/controllers/cloud.php:185](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:185>) |
| Purpose | cloud_admin_login |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | Login PIN credential. |
| Request body field references | username, pin |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error($pinError ?? "Invalid username or PIN format", 422, "VALIDATION_ERROR"); json_error("Too many failed attempts. Try again later.", 429, "AUTH_THROTTLED"); json_error("Invalid username or PIN", 401); json_error("Account inactive", 403, "ACCOUNT_INACTIVE"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/change-pin.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/change-pin.php |
| Source / implementation | [api/auth/change-pin.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/change-pin.php>); [php/controllers/cloud.php:346](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:346>) |
| Purpose | cloud_change_pin |
| Required role | active user |
| PIN requirement | currentPin and newPin required. |
| Request body field references | currentPin, newPin |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("PIN must be 4 to 8 digits", 422, "VALIDATION_ERROR"); json_error("New PIN must be different from current PIN", 422, "VALIDATION_ERROR"); json_error("Profile not found", 404); json_error("Current PIN incorrect", 401); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/data-export.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/data-export.php |
| Source / implementation | [api/auth/data-export.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/data-export.php>); [php/controllers/account.php:51](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/account.php:51>) |
| Purpose | account_data_export |
| Required role | active user |
| PIN requirement | PIN re-entry required. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON user and collection export; PIN required. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | audit_log_action, user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Use POST with { pin } in the body — GET would leak the PIN", 405, "METHOD_NOT_ALLOWED"); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Unauthorized", 401, "UNAUTHORIZED"); json_error("PIN re-entry required", 401, "PIN_REQUIRED"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/account-endpoints-e2e.mjs, tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/login.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/login.php |
| Source / implementation | [api/auth/login.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/login.php>); [php/controllers/cloud.php:129](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:129>) |
| Purpose | cloud_login |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | Login PIN credential. |
| Request body field references | username, pin |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error($pinError ?? "Invalid username or PIN format", 422, "VALIDATION_ERROR"); json_error("Too many failed attempts. Try again later.", 429, "AUTH_THROTTLED"); json_error("Invalid username or PIN", 401); json_error("Account inactive", 403, "ACCOUNT_INACTIVE"); json_error("Use /admin login for admin accounts", 403, "USE_ADMIN_PORTAL"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/logout.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/logout.php |
| Source / implementation | [api/auth/logout.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/logout.php>); [php/controllers/cloud.php:36](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:36>) |
| Purpose | cloud_logout |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Use POST to log out", 405, "METHOD_NOT_ALLOWED"); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/auth/me.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/auth/me.php |
| Source / implementation | [api/auth/me.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/me.php>); [php/controllers/cloud.php:229](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:229>) |
| Purpose | cloud_me |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("Cloud user not found", 404); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/account-endpoints-e2e.mjs, tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## PATCH /api/auth/profile.php

| Audit item | Finding |
| --- | --- |
| Method and path | PATCH /api/auth/profile.php |
| Source / implementation | [api/auth/profile.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/profile.php>); [php/controllers/cloud.php:281](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:281>) |
| Purpose | cloud_profile_update |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | displayName, mobile, email, avatarEmoji, avatarColor |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("Display name must be 1 to 60 characters", 422, "VALIDATION_ERROR"); json_error("Mobile must be up to 32 characters", 422, "VALIDATION_ERROR"); json_error("Email is invalid", 422, "VALIDATION_ERROR"); json_error("Avatar emoji is invalid", 422, "VALIDATION_ERROR"); json_error("Avatar color must be a hex color like #0ea5e9", 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/register.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/register.php |
| Source / implementation | [api/auth/register.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/register.php>); [php/controllers/cloud.php:55](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:55>) |
| Purpose | cloud_register |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | username, displayName, pin, policyAcceptances |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error("Invalid payload"); json_error($pinError ?? "Display name must be 1 to 60 characters", 422, "VALIDATION_ERROR"); json_error("Policy acceptance is required", 422, "POLICY_ACCEPTANCE_REQUIRED"); json_error("Terms and Privacy acceptance is required", 422, "POLICY_ACCEPTANCE_REQUIRED"); json_error("Username already exists", 409); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/reset-pin.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/reset-pin.php |
| Source / implementation | [api/auth/reset-pin.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/reset-pin.php>); [php/controllers/cloud.php:435](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:435>) |
| Purpose | cloud_reset_pin_with_security |
| Required role | active user |
| PIN requirement | Security answer plus active session, not current PIN. |
| Request body field references | securityAnswer, newPin |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("PIN must be 4 to 8 digits", 422, "VALIDATION_ERROR"); json_error("Security answer is required", 422, "VALIDATION_ERROR"); json_error("Profile not found", 404); json_error("Security recovery is not configured", 422); json_error("Security answer is incorrect", 401); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/auth/security-recovery.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/auth/security-recovery.php |
| Source / implementation | [api/auth/security-recovery.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/security-recovery.php>); [php/controllers/cloud.php:398](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:398>) |
| Purpose | cloud_set_security_recovery |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | securityQuestion, securityAnswer |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("Security question must be 5 to 255 characters", 422, "VALIDATION_ERROR"); json_error("Security answer must be 3 to 255 characters", 422, "VALIDATION_ERROR"); json_error("Profile not found", 404); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / PATCH / DELETE /api/cloud/entity-item.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, PATCH, DELETE /api/cloud/entity-item.php |
| Source / implementation | [api/cloud/entity-item.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/entity-item.php>); [php/controllers/cloud_data.php:382](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:382>); [php/controllers/cloud_data.php:403](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:403>); [php/controllers/cloud_data.php:547](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:547>) |
| Purpose | cloud_entity_get_one, cloud_entity_patch_one, cloud_entity_delete_one |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | patch |
| Query parameter references | collection, id, hard |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | cloud_collection_rows; financial_events/effects for transactions; mutation keys; server/user audit helpers |
| Audit helper reachability | cloud_audit_transaction_change, user_audit_log, cloud_audit_sensitive_collection_change |
| Validation | Collection allowlist, tenant, JSON size, paise normalization and transaction validation; incomplete non-transaction schemas and reference integrity. |
| Error branches in source | json_error("Not found", 404); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Invalid collection", 400); json_error($e->getMessage(), 401); json_error("Entity not found", 404); json_error("patch is required", 400); json_error("Forbidden patch field: " . $deniedField, 422, "PATCH_FIELD_NOT_ALLOWED"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B01-B05, B12-B14, B37 depending on operation. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / POST / PATCH / DELETE /api/cloud/entity.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, POST, PATCH, DELETE /api/cloud/entity.php |
| Source / implementation | [api/cloud/entity.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/entity.php>); [php/controllers/cloud_data.php:159](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:159>); [php/controllers/cloud_data.php:190](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:190>); [php/controllers/cloud_data.php:295](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:295>); [php/controllers/cloud_data.php:473](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:473>) |
| Purpose | cloud_entity_list, cloud_entity_create, cloud_entity_delete_bulk, cloud_entity_patch_many |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | userId, data, idPrefix, mutationId, ids, patch |
| Query parameter references | collection, userId |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | cloud_collection_rows; financial_events/effects for transactions; mutation keys; server/user audit helpers |
| Audit helper reachability | cloud_audit_sensitive_collection_change, user_audit_log, cloud_audit_transaction_change |
| Validation | Collection allowlist, tenant, JSON size, paise normalization and transaction validation; incomplete non-transaction schemas and reference integrity. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Invalid collection", 400); json_error($e->getMessage(), 401); json_error("userId query is required", 400); json_error("userId and data are required", 400); json_error("userId must match authenticated user", 403, "USER_MISMATCH"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error("ids and patch are required", 400, "INVALID_BATCH_PATCH"); json_error("Forbidden patch field: " . $deniedField, 422, "PATCH_FIELD_NOT_ALLOWED"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B01-B05, B12-B14, B37 depending on operation. |
| Existing test references | tests/api-vnext-collections-e2e.mjs, tests/browser-manual-qa-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/cloud/login.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/cloud/login.php |
| Source / implementation | [api/cloud/login.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/login.php>); [php/controllers/cloud.php:129](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:129>) |
| Purpose | cloud_login |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | Login PIN credential. |
| Request body field references | username, pin |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error($pinError ?? "Invalid username or PIN format", 422, "VALIDATION_ERROR"); json_error("Too many failed attempts. Try again later.", 429, "AUTH_THROTTLED"); json_error("Invalid username or PIN", 401); json_error("Account inactive", 403, "ACCOUNT_INACTIVE"); json_error("Use /admin login for admin accounts", 403, "USE_ADMIN_PORTAL"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/account-endpoints-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/cloud/me.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/cloud/me.php |
| Source / implementation | [api/cloud/me.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/me.php>); [php/controllers/cloud.php:229](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:229>) |
| Purpose | cloud_me |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("Cloud user not found", 404); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/browser-manual-qa-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/cloud/register.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/cloud/register.php |
| Source / implementation | [api/cloud/register.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/register.php>); [php/controllers/cloud.php:55](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:55>) |
| Purpose | cloud_register |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | username, displayName, pin, policyAcceptances |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error("Invalid payload"); json_error($pinError ?? "Display name must be 1 to 60 characters", 422, "VALIDATION_ERROR"); json_error("Policy acceptance is required", 422, "POLICY_ACCEPTANCE_REQUIRED"); json_error("Terms and Privacy acceptance is required", 422, "POLICY_ACCEPTANCE_REQUIRED"); json_error("Username already exists", 409); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B06-B11 and B33 depending on endpoint. |
| Existing test references | tests/account-endpoints-e2e.mjs, tests/phase-04-validation-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/cloud/sync/pull.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/cloud/sync/pull.php |
| Source / implementation | [api/cloud/sync/pull.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/sync/pull.php>); [php/controllers/cloud_data.php:45](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:45>) |
| Purpose | cloud_sync_pull |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | cloud_collection_rows; financial_events/effects for transactions; mutation keys; server/user audit helpers |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Collection allowlist, tenant, JSON size, paise normalization and transaction validation; incomplete non-transaction schemas and reference integrity. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B01-B05, B12-B14, B37 depending on operation. |
| Existing test references | tests/api-vnext-collections-e2e.mjs, tests/phase-04-validation-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/cloud/sync/push.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/cloud/sync/push.php |
| Source / implementation | [api/cloud/sync/push.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/cloud/sync/push.php>); [php/controllers/cloud_data.php:69](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:69>) |
| Purpose | cloud_sync_push |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | collections |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | cloud_collection_rows; financial_events/effects for transactions; mutation keys; server/user audit helpers |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Collection allowlist, tenant, JSON size, paise normalization and transaction validation; incomplete non-transaction schemas and reference integrity. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401); json_error("Invalid sync payload", 400); json_error($e->getMessage(), 413, "PAYLOAD_TOO_LARGE"); json_error("Unknown or invalid collection: " . (is_string($collection) ? $collection : ""), 400, "INVALID_COLLECTION"); json_error("Invalid rows for collection " . $collection, 400, "INVALID_COLLECTION_ROWS"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: yes (branch dependent); rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B01-B05, B12-B14, B37 depending on operation. |
| Existing test references | tests/account-endpoints-e2e.mjs, tests/local-phase-10-privacy-audit-e2e.mjs, tests/phase-04-validation-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / PATCH / DELETE /api/data/entity-item.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, PATCH, DELETE /api/data/entity-item.php |
| Source / implementation | [api/data/entity-item.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/data/entity-item.php>); [php/controllers/cloud_data.php:382](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:382>); [php/controllers/cloud_data.php:403](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:403>); [php/controllers/cloud_data.php:547](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:547>) |
| Purpose | cloud_entity_get_one, cloud_entity_patch_one, cloud_entity_delete_one |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | patch |
| Query parameter references | collection, id, hard |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | cloud_collection_rows; financial_events/effects for transactions; mutation keys; server/user audit helpers |
| Audit helper reachability | cloud_audit_transaction_change, user_audit_log, cloud_audit_sensitive_collection_change |
| Validation | Collection allowlist, tenant, JSON size, paise normalization and transaction validation; incomplete non-transaction schemas and reference integrity. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Invalid collection", 400); json_error($e->getMessage(), 401); json_error("Entity not found", 404); json_error("patch is required", 400); json_error("Forbidden patch field: " . $deniedField, 422, "PATCH_FIELD_NOT_ALLOWED"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B01-B05, B12-B14, B37 depending on operation. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET / POST / PATCH / DELETE /api/data/entity.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET, POST, PATCH, DELETE /api/data/entity.php |
| Source / implementation | [api/data/entity.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/data/entity.php>); [php/controllers/cloud_data.php:159](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:159>); [php/controllers/cloud_data.php:190](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:190>); [php/controllers/cloud_data.php:295](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:295>); [php/controllers/cloud_data.php:473](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:473>) |
| Purpose | cloud_entity_list, cloud_entity_create, cloud_entity_delete_bulk, cloud_entity_patch_many |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | userId, data, idPrefix, mutationId, ids, patch |
| Query parameter references | collection, userId |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | cloud_collection_rows; financial_events/effects for transactions; mutation keys; server/user audit helpers |
| Audit helper reachability | cloud_audit_sensitive_collection_change, user_audit_log, cloud_audit_transaction_change |
| Validation | Collection allowlist, tenant, JSON size, paise normalization and transaction validation; incomplete non-transaction schemas and reference integrity. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Invalid collection", 400); json_error($e->getMessage(), 401); json_error("userId query is required", 400); json_error("userId and data are required", 400); json_error("userId must match authenticated user", 403, "USER_MISMATCH"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error("ids and patch are required", 400, "INVALID_BATCH_PATCH"); json_error("Forbidden patch field: " . $deniedField, 422, "PATCH_FIELD_NOT_ALLOWED"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | B01-B05, B12-B14, B37 depending on operation. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/health.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/health.php |
| Source / implementation | [api/health.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/health.php>); [php/controllers/public_config.php:26](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/public_config.php:26>) |
| Purpose | health_check_get |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | Health JSON with database connectivity result. |
| Tables / collections | database connectivity (read check) |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/import/transactions.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/import/transactions.php |
| Source / implementation | [api/import/transactions.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/import/transactions.php>); [php/controllers/imports.php:12](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/imports.php:12>) |
| Purpose | imports_transactions_bulk |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | rows |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | users, recovery/policy/login/rate-limit and audit tables; account export/delete may touch owned collections |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 401, "UNAUTHORIZED"); json_error("rows is required", 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/payments/razorpay/webhook.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/payments/razorpay/webhook.php |
| Source / implementation | [api/payments/razorpay/webhook.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/payments/razorpay/webhook.php>); [php/controllers/payments.php:29](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/payments.php:29>) |
| Purpose | razorpay_webhook |
| Required role | public signed provider request |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | plans, subscriptions, payment/order records and webhook replay data |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Invalid payload", 400, "INVALID_PAYLOAD"); json_error("Invalid JSON payload", 400, "INVALID_JSON"); json_error("Invalid webhook signature", 401, "INVALID_SIGNATURE"); json_error("Order not recognised", 404, "ORDER_NOT_FOUND"); json_error("Payment amount or currency does not match the original order", 400, "AMOUNT_MISMATCH"); json_error("Payment could not be updated", 409, "PAYMENT_UPDATE_CONFLICT"); json_error("Subscription update failed", 409, "SUBSCRIPTION_UPDATE_CONFLICT"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public signed provider request; CSRF reachable: no; rate helper reachable: yes. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/api-e2e.mjs, tests/webhook-ownership-e2e.mjs, tests/webhook-replay-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/policies/accept.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/policies/accept.php |
| Source / implementation | [api/policies/accept.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/policies/accept.php>); [php/controllers/policies.php:27](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/policies.php:27>) |
| Purpose | policies_accept |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | accept |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | policies / user_policy_acceptances |
| Audit helper reachability | user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Unauthorized", 401, "UNAUTHORIZED"); json_error("'accept' must be a non-empty array of {key, version}", 422, "VALIDATION_ERROR"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/local-phase-10-privacy-audit-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/policies/current.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/policies/current.php |
| Source / implementation | [api/policies/current.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/policies/current.php>); [php/controllers/policies.php:11](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/policies.php:11>) |
| Purpose | policies_current |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | policies / user_policy_acceptances |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/account-endpoints-e2e.mjs, tests/api-e2e.mjs, tests/api-vnext-collections-e2e.mjs, tests/browser-manual-qa-e2e.mjs, tests/local-phase-10-privacy-audit-e2e.mjs, tests/phase-04-validation-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/public/config.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/public/config.php |
| Source / implementation | [api/public/config.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/public/config.php>); [php/controllers/public_config.php:7](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/public_config.php:7>) |
| Purpose | public_config_get |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | feature_flags, app_settings |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/api-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/subscriptions/cancel.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/subscriptions/cancel.php |
| Source / implementation | [api/subscriptions/cancel.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/subscriptions/cancel.php>); [php/controllers/subscriptions.php:260](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/subscriptions.php:260>) |
| Purpose | subscriptions_cancel |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | subscriptionId |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | plans, subscriptions, payment/order records and webhook replay data |
| Audit helper reachability | audit_log_action, user_audit_log |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("subscriptionId is required", 422, "VALIDATION_ERROR"); json_error("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/subscriptions/confirm-payment.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/subscriptions/confirm-payment.php |
| Source / implementation | [api/subscriptions/confirm-payment.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/subscriptions/confirm-payment.php>); [php/controllers/subscriptions.php:187](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/subscriptions.php:187>) |
| Purpose | subscriptions_confirm_payment |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | plans, subscriptions, payment/order records and webhook replay data |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error("Invalid payment signature", 401, "INVALID_SIGNATURE"); json_error("Payment not found", 404, "PAYMENT_NOT_FOUND"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | No textual candidate test reference found. Aliases may be tested indirectly. |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## POST /api/subscriptions/create-order.php

| Audit item | Finding |
| --- | --- |
| Method and path | POST /api/subscriptions/create-order.php |
| Source / implementation | [api/subscriptions/create-order.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/subscriptions/create-order.php>); [php/controllers/subscriptions.php:65](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/subscriptions.php:65>) |
| Purpose | subscriptions_create_order |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | planId |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | plans, subscriptions, payment/order records and webhook replay data |
| Audit helper reachability | audit_log_action |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Unauthorized", 401, "UNAUTHORIZED"); json_error($e->getMessage(), 422, "VALIDATION_ERROR"); json_error("planId is required", 422, "VALIDATION_ERROR"); json_error("Plan not found", 404, "PLAN_NOT_FOUND"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/api-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/subscriptions/my.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/subscriptions/my.php |
| Source / implementation | [api/subscriptions/my.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/subscriptions/my.php>); [php/controllers/subscriptions.php:241](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/subscriptions.php:241>) |
| Purpose | subscriptions_my |
| Required role | active user |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | plans, subscriptions, payment/order records and webhook replay data |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error("Unauthorized", 401, "UNAUTHORIZED"); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: active user; CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/api-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## GET /api/subscriptions/plans.php

| Audit item | Finding |
| --- | --- |
| Method and path | GET /api/subscriptions/plans.php |
| Source / implementation | [api/subscriptions/plans.php](</Volumes/ssd12/SparowVault/230826 SparowVault/api/subscriptions/plans.php>); [php/controllers/subscriptions.php:45](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/subscriptions.php:45>) |
| Purpose | subscriptions_list_plans |
| Required role | public (admin-login verifies admin credentials) |
| PIN requirement | No separate action-PIN guard identified. |
| Request body field references | None extracted / delegated body schema. Field lists are branch-dependent, not all required. |
| Query parameter references | None directly extracted. Generic entity aliases require collection; item routes also require id. |
| Response | JSON ok/data or error wrapper; exact entity/result fields originate in linked controller. |
| Tables / collections | plans, subscriptions, payment/order records and webhook replay data |
| Audit helper reachability | No audit helper found in static call graph. |
| Validation | Controller-specific body/method/role checks; inspect linked controller for mandatory versus optional fields. |
| Error branches in source | json_error("Method not allowed", 405); json_error($e->getMessage() !== "" ? $e->getMessage() : "Internal error", 500); json_error(string $message, int $status = 400, ?string $code = null): void { http_response_code($status) |
| Security checks | Auth: public (admin-login verifies admin credentials); CSRF reachable: no; rate helper reachable: no. Static reachability is not dynamic coverage. |
| Possible/confirmed bugs | No endpoint-specific clean bill; see payment/security test boundaries. |
| Existing test references | tests/api-e2e.mjs |
| Missing coverage | All method/role/tenant/CSRF/body-size/error branches have not been executed for this individual file. Table above is complete surface inventory, not a claim of complete API coverage. |
| Recommended improvement | Centralize authorization/CSRF/error/validation contracts and transaction boundaries; add data-driven tests for every alias and status. |

## Legacy alias drift

The extensionless `/api/cloud/entity/{collection}` dispatcher supports GET/POST/DELETE but not collection PATCH, while `.php?collection=...` supports PATCH. Item aliases support GET/PATCH/DELETE. Legacy register/login/me and sync pull/push aliases also exist. The direct admin subscriptions wrapper supports mutation dispatch while legacy dispatch paths can differ. Use one generated route registry and parity tests; do not assume a passing test against one alias validates another.

## Runtime evidence

Core API suite: 65/65 PASS. vNext collection smoke: 11 PASS lines. Webhook ownership/signature suite: 9 PASS lines. Account suite: 9 PASS / 1 FAIL, with a failed seeding setup rather than demonstrated tenant leak. Validation suite: 10 PASS / 2 FAIL, with 8 apparent validation passes actually stopped by CSRF. Webhook replay suite did not reach webhook assertions because its username fixture exceeded the schema length. Additional X05 proves correctly seeded own-data export succeeds. See TESTING-COVERAGE-REPORT.md for exact commands and limits.
