<?php

require_once __DIR__ . "/../config/env.php";

function razorpay_key_id(): string {
    return (string)(env_value("RAZORPAY_KEY_ID", "") ?? "");
}

function razorpay_key_secret(): string {
    return (string)(env_value("RAZORPAY_KEY_SECRET", "") ?? "");
}

function razorpay_webhook_secret(): string {
    return (string)(env_value("RAZORPAY_WEBHOOK_SECRET", "") ?? "");
}

function razorpay_request(string $method, string $path, array $payload = []): array {
    $url = "https://api.razorpay.com/v1/" . ltrim($path, "/");
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException("Failed to initialize payment client");
    }
    $headers = ["Content-Type: application/json"];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, razorpay_key_id() . ":" . razorpay_key_secret());
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
    if (count($payload) > 0) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_SLASHES));
    }
    $raw = curl_exec($ch);
    if ($raw === false) {
        throw new RuntimeException("Payment provider request failed");
    }
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new RuntimeException("Invalid payment provider response");
    }
    if ($status < 200 || $status >= 300) {
        $description = (string)($decoded["error"]["description"] ?? "Razorpay error");
        throw new RuntimeException($description);
    }
    return $decoded;
}

function razorpay_verify_signature(string $orderId, string $paymentId, string $signature): bool {
    $expected = hash_hmac("sha256", $orderId . "|" . $paymentId, razorpay_key_secret());
    return hash_equals($expected, $signature);
}

function razorpay_verify_webhook_signature(string $body, string $signature): bool {
    $expected = hash_hmac("sha256", $body, razorpay_webhook_secret());
    return hash_equals($expected, $signature);
}

