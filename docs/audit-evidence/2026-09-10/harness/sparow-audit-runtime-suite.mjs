import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(process.cwd()+'/package.json');
const mysql=require('mysql2/promise');
const env={...process.env,APP_ENV:'development',DB_HOST:'127.0.0.1',DB_USER:'root',DB_PASS:'',DB_NAME:'sparowvault_audit_test_20260910',TEST_DB_HOST:'127.0.0.1',TEST_DB_USER:'root',TEST_DB_PASS:'',TEST_DB_NAME:'sparowvault_audit_test_20260910',BASE_URL:'http://localhost:5176',FRONTEND_URL:'http://localhost:5176',VITE_API_BASE_URL:'http://localhost:8086',VITE_API_TARGET:'http://localhost:8086',CLOUD_JWT_SECRET:'audit-only-20260910-synthetic-credentials-do-not-deploy',CLOUD_JWT_EXPIRES_IN:'1h',RAZORPAY_WEBHOOK_SECRET:'audit-only-webhook-key',RAZORPAY_KEY_ID:'audit-disabled',RAZORPAY_KEY_SECRET:'audit-only-disabled-key',ENABLE_RAZORPAY:'false',PHP_CLI_SERVER_WORKERS:'4'};
const children=[];
function start(cmd,args){const c=spawn(cmd,args,{env,stdio:'ignore',detached:true});children.push(c);return c;}
start('php',['-S','localhost:8086','-t','.','php/dev-router.php']);
start('node',['node_modules/vite/bin/vite.js','--port','5176','--strictPort']);
const cleanup=()=>{for(const c of children)try{process.kill(-c.pid,'SIGTERM');}catch{/* ended */}};
process.on('SIGINT',()=>{cleanup();process.exit(130);});process.on('SIGTERM',()=>{cleanup();process.exit(143);});
const conn=await mysql.createConnection({host:'127.0.0.1',user:'root',password:'',database:env.DB_NAME});
try{
 for(const url of ['http://localhost:8086/api/health.php',env.FRONTEND_URL])for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)break;}catch{/* startup */}await new Promise(r=>setTimeout(r,300));}
 for(const [label,script] of (process.env.AUDIT_ONLY==='extra'?[['extra-probes','/tmp/sparow-audit-extra.mjs']]:process.env.AUDIT_ONLY==='browser'?[['browser-audit','/tmp/sparow-audit-browser.mjs']]:[['security-probes','/tmp/sparow-audit-security.mjs'],['browser-existing','tests/browser-e2e.mjs'],['browser-vnext','tests/browser-finance-vnext-e2e.mjs'],['browser-offline-existing','tests/browser-offline-finance-e2e.mjs'],['browser-audit','/tmp/sparow-audit-browser.mjs']])){
  await conn.query('DELETE FROM api_rate_limits');
  const c=spawn('node',['/tmp/sparow-audit-run.mjs',label,'node',script],{env:{...env,AUDIT_TIMEOUT_MS:'180000'},stdio:'inherit'});
  await new Promise(r=>c.on('close',r));
 }
}finally{await conn.end();cleanup();}
