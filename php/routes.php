<?php

require_once __DIR__ . "/controllers/cloud.php";
require_once __DIR__ . "/controllers/cloud_data.php";
require_once __DIR__ . "/controllers/public_config.php";
require_once __DIR__ . "/controllers/subscriptions.php";
require_once __DIR__ . "/controllers/payments.php";
require_once __DIR__ . "/controllers/admin.php";
require_once __DIR__ . "/controllers/imports.php";
require_once __DIR__ . "/controllers/aa.php";
require_once __DIR__ . "/controllers/account.php";
require_once __DIR__ . "/helpers/http.php";

function dispatch_request(): void {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    $uri = parse_url($_SERVER["REQUEST_URI"] ?? "/", PHP_URL_PATH);
    if (!is_string($uri)) $uri = "/";

    if ($uri === "/api/health.php") {
        if ($method === "GET") {
            health_check_get();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/public/config.php") {
        if ($method === "GET") {
            public_config_get();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }

    if ($uri === "/api/auth/register.php") {
        if ($method === "POST") {
            cloud_register();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/login.php") {
        if ($method === "POST") {
            cloud_login();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/admin-login.php") {
        if ($method === "POST") {
            cloud_admin_login();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/logout.php") {
        if ($method === "POST") {
            cloud_logout();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/me.php") {
        if ($method === "GET") {
            cloud_me();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/change-pin.php") {
        if ($method === "POST") {
            cloud_change_pin();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/security-recovery.php") {
        if ($method === "POST") {
            cloud_set_security_recovery();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/reset-pin.php") {
        if ($method === "POST") {
            cloud_reset_pin_with_security();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/profile.php") {
        if ($method === "PATCH") {
            cloud_profile_update();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/data-export.php") {
        if ($method === "POST") {
            account_data_export();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/auth/account.php") {
        if ($method === "DELETE" || $method === "POST") {
            account_delete();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }

    if ($uri === "/api/data/entity.php" || $uri === "/api/cloud/entity.php") {
        $collection = isset($_GET["collection"]) ? (string)$_GET["collection"] : "";
        if ($method === "GET") {
            cloud_entity_list($collection);
            return;
        }
        if ($method === "POST") {
            cloud_entity_create($collection);
            return;
        }
        if ($method === "PATCH") {
            cloud_entity_patch_many($collection);
            return;
        }
        if ($method === "DELETE") {
            cloud_entity_delete_bulk($collection);
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/data/entity-item.php" || $uri === "/api/cloud/entity-item.php") {
        $collection = isset($_GET["collection"]) ? (string)$_GET["collection"] : "";
        $id = isset($_GET["id"]) ? (string)$_GET["id"] : "";
        if ($method === "GET") {
            cloud_entity_get_one($collection, $id);
            return;
        }
        if ($method === "PATCH") {
            cloud_entity_patch_one($collection, $id);
            return;
        }
        if ($method === "DELETE") {
            cloud_entity_delete_one($collection, $id);
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }

    if ($uri === "/api/import/transactions.php") {
        if ($method === "POST") {
            imports_transactions_bulk();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/aa/status.php") {
        if ($method === "GET") {
            aa_status();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/aa/forward.php") {
        if ($method === "POST") {
            aa_forward();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }

    if ($uri === "/api/subscriptions/plans.php") {
        if ($method === "GET") {
            subscriptions_list_plans();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/subscriptions/create-order.php") {
        if ($method === "POST") {
            subscriptions_create_order();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/subscriptions/my.php") {
        if ($method === "GET") {
            subscriptions_my();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/subscriptions/confirm-payment.php") {
        if ($method === "POST") {
            subscriptions_confirm_payment();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/subscriptions/cancel.php") {
        if ($method === "POST") {
            subscriptions_cancel();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/payments/razorpay/webhook.php") {
        if ($method === "POST") {
            razorpay_webhook();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }

    if ($uri === "/api/admin/dashboard.php") {
        if ($method === "GET") {
            admin_dashboard();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/users.php") {
        if ($method === "GET") {
            admin_users_list();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/plans.php") {
        if ($method === "GET") {
            admin_plans_list();
            return;
        }
        if ($method === "POST" || $method === "PUT") {
            admin_plans_upsert();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/feature-flags.php") {
        if ($method === "GET") {
            admin_feature_flags_get();
            return;
        }
        if ($method === "POST" || $method === "PUT") {
            admin_feature_flags_put();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/settings.php") {
        if ($method === "GET") {
            admin_settings_get();
            return;
        }
        if ($method === "POST" || $method === "PUT") {
            admin_settings_put();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/subscriptions.php") {
        if ($method === "GET") {
            admin_subscriptions_list();
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/users-assign-plan.php") {
        if ($method === "POST") {
            $body = require_json_body();
            $userId = (string)($body["userId"] ?? "");
            $planId = (int)($body["planId"] ?? 0);
            if ($userId === "") {
                json_error("userId is required", 422, "VALIDATION_ERROR");
                return;
            }
            admin_assign_plan($userId, $planId);
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }
    if ($uri === "/api/admin/users-toggle-active.php") {
        if ($method === "POST") {
            $body = require_json_body();
            $userId = (string)($body["userId"] ?? "");
            if ($userId === "") {
                json_error("userId is required", 422, "VALIDATION_ERROR");
                return;
            }
            admin_toggle_user_active($userId);
            return;
        }
        json_error("Method not allowed", 405);
        return;
    }

    if ($method === "POST" && $uri === "/api/cloud/register") {
        cloud_register();
        return;
    }
    if ($method === "POST" && $uri === "/api/cloud/login") {
        cloud_login();
        return;
    }
    if ($method === "GET" && $uri === "/api/cloud/me") {
        cloud_me();
        return;
    }
    if ($method === "GET" && $uri === "/api/cloud/sync/pull") {
        cloud_sync_pull();
        return;
    }
    if ($method === "POST" && $uri === "/api/cloud/sync/push") {
        cloud_sync_push();
        return;
    }

    if (preg_match('#^/api/cloud/entity/([^/]+)$#', $uri, $m) === 1) {
        $collection = urldecode($m[1]);
        if ($method === "GET") {
            cloud_entity_list($collection);
            return;
        }
        if ($method === "POST") {
            cloud_entity_create($collection);
            return;
        }
        if ($method === "DELETE") {
            cloud_entity_delete_bulk($collection);
            return;
        }
    }

    if (preg_match('#^/api/cloud/entity/([^/]+)/([^/]+)$#', $uri, $m) === 1) {
        $collection = urldecode($m[1]);
        $id = urldecode($m[2]);
        if ($method === "GET") {
            cloud_entity_get_one($collection, $id);
            return;
        }
        if ($method === "PATCH") {
            cloud_entity_patch_one($collection, $id);
            return;
        }
        if ($method === "DELETE") {
            cloud_entity_delete_one($collection, $id);
            return;
        }
    }

    json_error("Not found", 404);
}

