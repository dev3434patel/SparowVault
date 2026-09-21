import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const mysql = require('mysql2/promise');
const env = { ...process.env, APP_ENV: 'development', DB_HOST: '127.0.0.1', DB_USER: 'root', DB_PASS: '', DB_NAME: 'sparowvault_audit_test_20260910', TEST_DB_HOST: '127.0.0.1', TEST_DB_USER: 'root', TEST_DB_PASS: '', TEST_DB_NAME: 'sparowvault_audit_test_20260910', BASE_URL: 'http://localhost:8086', FRONTEND_URL: 'http://localhost:5176', CLOUD_JWT_SECRET: 'audit-only-20260910-synthetic-credentials-do-not-deploy', CLOUD_JWT_EXPIRES_IN: '1h', RAZORPAY_WEBHOOK_SECRET: 'audit-only-webhook-key', RAZORPAY_KEY_ID: 'audit-disabled', RAZORPAY_KEY_SECRET: 'audit-only-disabled-key', ENABLE_RAZORPAY: 'false' };
const php = spawn('php', ['-S', 'localhost:8086', '-t', '.', 'php/dev-router.php'], { env, stdio: 'ignore' });
const conn = await mysql.createConnection({host: env.DB_HOST, user: env.DB_USER, password: '', database: env.DB_NAME});
process.on('SIGTERM', () => { php.kill(); process.exit(143); });
process.on('SIGINT', () => { php.kill(); process.exit(130); });
try {
  for (let n=0; n<60; n++) {
    try { const r=await fetch(env.BASE_URL + '/api/health.php'); if(r.ok) break; } catch { /* startup */ }
    await new Promise(r=>setTimeout(r, 300));
  }
  for (const [label, file] of [
    ['api', 'api-e2e.mjs'], ['api-vnext', 'api-vnext-collections-e2e.mjs'],
    ['account-api', 'account-endpoints-e2e.mjs'], ['validation-api', 'phase-04-validation-e2e.mjs'],
    ['webhook-replay', 'webhook-replay-e2e.mjs'], ['webhook-ownership', 'webhook-ownership-e2e.mjs'],
  ]) {
    await conn.query('DELETE FROM api_rate_limits');
    const result = spawnSync('node', ['/tmp/sparow-audit-run.mjs', label, 'node', 'tests/' + file], {env, stdio:'inherit', timeout:300000});
    console.log('AUDIT SUITE',label,'EXIT',result.status);
  }
} finally {
  await conn.end();
  php.kill();
}
