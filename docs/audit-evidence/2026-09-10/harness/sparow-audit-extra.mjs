import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(process.cwd()+'/package.json'),mysql=require('mysql2/promise');
const db=await mysql.createConnection({host:'127.0.0.1',user:'root',database:'sparowvault_audit_test_20260910'}),rows=[];
const record=(id,name,expected,actual)=>{const pass=JSON.stringify(expected)===JSON.stringify(actual);rows.push({id,name,expected,actual,pass});console.log(pass?'PASS':'FAIL',id,name,JSON.stringify(actual));};
async function req(path,method='GET',body,auth){const r=await fetch('http://localhost:8086'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth.token}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:(await r.json()).data};}
try {
 const p=(await req('/api/policies/current.php')).data.versions;
 const username='extra_'+Date.now().toString(36),pin='583921';
 const a=(await req('/api/auth/register.php','POST',{username,displayName:'Extra fixture',pin,policyAcceptances:['terms','privacy'].map(key=>({key,version:p[key]}))})).data;
 const create=(collection,data)=>req('/api/data/entity.php?collection='+collection,'POST',{userId:a.user.id,data},a);
 const admin=(await req('/api/auth/admin-login.php','POST',{username:'admin',pin:'12345678'})).data;
 const [old]=await db.query("SELECT must_change_pin FROM users WHERE username='admin'");
 await db.query("UPDATE users SET must_change_pin=1 WHERE username='admin'");
 try {const r=await req('/api/admin/users.php','GET',undefined,admin);record('X01','must_change_pin=1 blocks privileged reads',true,r.status>=400);}finally{await db.query("UPDATE users SET must_change_pin=? WHERE username='admin'",[old[0].must_change_pin]);}
 const recovery=await req('/api/auth/security-recovery.php','POST',{securityQuestion:'Replaced recovery question',securityAnswer:'knownvalue'},a);
 const reset=await req('/api/auth/reset-pin.php','POST',{securityAnswer:'knownvalue',newPin:'674532'},a);
 record('X02','replacing recovery and resetting PIN requires original PIN',true,recovery.status>=400||reset.status>=400);
 const bad=await create('categories',{name:'Invalid enum fixture',appliesTo:'impossible'});
 record('X03','category schema rejects unsupported appliesTo',422,bad.status);
 const tx=await create('transactions',{date:'2026-09-10T12:00:00.000Z',type:'expense',amount:1,amountPaise:100,paymentMode:'cash',businessOrPersonal:'personal',categoryId:'does-not-exist',accountId:'does-not-exist',description:'Orphan reference fixture'});
 record('X04','transactions reject nonexistent financial references',422,tx.status);
 const own=await create('categories',{name:'Owned export fixture',appliesTo:'expense',icon:'tag',color:'#ef4444'});
 const exp=await req('/api/auth/data-export.php','POST',{pin:'674532'},a);
 record('X05','properly seeded own category is present in account export',true,exp.status===200&&exp.data.collections.categories.some(r=>r.entityId===own.data.id));
 const {chromium}=require('@playwright/test'),browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(15000);
  await page.goto('http://localhost:5176',{waitUntil:'networkidle'});
  await page.locator('input').first().fill(username);await page.locator('input[type=password]').fill('674532');await page.locator('form button[type=submit]').click();
  await page.locator('aside').waitFor();await page.waitForLoadState('networkidle');
  await page.goto('http://localhost:5176/import',{waitUntil:'networkidle'});
  const common={userId:'backup-owner',createdAt:'2026-09-10T00:00:00.000Z',updatedAt:'2026-09-10T00:00:00.000Z',isDeleted:0,version:1,tags:[],notes:''};
  const backup={version:1,collections:{accounts:[{...common,id:'old-account',name:'Restored Account Probe',type:'cash',openingBalance:0,openingBalancePaise:0,color:'#00aa00',icon:'wallet'}],categories:[{...common,id:'old-category',name:'Restored Category Probe',appliesTo:'expense',color:'#00aa00',icon:'tag'}],transactions:[{...common,id:'old-transaction',date:'2026-09-01T00:00:00.000Z',type:'expense',amount:10,amountPaise:1000,accountId:'old-account',categoryId:'old-category',paymentMode:'cash',businessOrPersonal:'personal',description:'Restored Transaction Probe'}]}};
  await page.locator('input[type=file][accept=".json"]').setInputFiles({name:'audit-linked-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await page.getByRole('button',{name:'Continue restore',exact:true}).click();
  await page.getByText('Backup restored',{exact:true}).waitFor();
  const restored=(await req('/api/data/entity.php?collection=transactions&userId='+a.user.id,'GET',undefined,a)).data.find(t=>t.description==='Restored Transaction Probe');
  const accounts=(await req('/api/data/entity.php?collection=accounts&userId='+a.user.id,'GET',undefined,a)).data;
  const cats=(await req('/api/data/entity.php?collection=categories&userId='+a.user.id,'GET',undefined,a)).data;
  const actual={accountExists:accounts.some(x=>x.id===restored.accountId),categoryExists:cats.some(x=>x.id===restored.categoryId)};
  record('X06','backup restore preserves account and category references',{accountExists:true,categoryExists:true},actual);
  await page.screenshot({path:'docs/audit-evidence/2026-09-10/screenshots/restore-probe.png'});
  const house=(await create('households',{name:'Wipe retained fixture',defaultCurrency:'INR'})).data;
  await page.goto('http://localhost:5176/settings',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Wipe all profile data',exact:true}).click();
  await page.getByRole('dialog').getByPlaceholder('DELETE '+username).fill('DELETE '+username);
  await page.getByRole('button',{name:'Delete all data',exact:true}).click();
  await page.getByText('Profile data wiped',{exact:true}).waitFor();
  const retained=await req('/api/data/entity-item.php?collection=households&id='+house.id,'GET',undefined,a);
  record('X07','wipe all profile data removes household fixture',404,retained.status);
 } finally {await browser.close();}
}finally{await db.end();writeFileSync('docs/audit-evidence/2026-09-10/extra-probes.json',JSON.stringify({date:new Date().toISOString(),rows},null,2));}
