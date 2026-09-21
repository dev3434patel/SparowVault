import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require=createRequire(process.cwd()+'/package.json'),{chromium}=require('@playwright/test');
const dir='docs/audit-evidence/2026-09-10',base='http://localhost:5176';
mkdirSync(dir+'/screenshots',{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
page.setDefaultTimeout(10000);
const result={date:new Date().toISOString(),pages:[],errors:[],checks:[]};
page.on('pageerror',e=>result.errors.push({url:page.url(),message:e.message}));
const record=(name,pass,actual)=>{result.checks.push({name,pass,actual});console.log(pass?'PASS':'FAIL',name,JSON.stringify(actual));};
try{
 await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:/^create account$/i}).first().click();
 await page.getByPlaceholder('User Name').fill('Audit Browser');
 await page.getByPlaceholder('amit',{exact:true}).fill('ui_'+Date.now().toString(36));
 await page.locator('input[type=password]').nth(0).fill('583921');
 await page.locator('input[type=password]').nth(1).fill('583921');
 await page.locator('input[type=checkbox]').first().check();
 await page.locator('form button[type=submit]').click();
 await page.locator('aside').waitFor({timeout:45000});
 await page.waitForLoadState('networkidle');
 record('Registration reaches authenticated shell',true,await page.locator('aside').isVisible());
 const routes=['/','/transactions','/income','/expenses','/budgets','/goals','/accounts','/cards','/loans','/udhari','/savings','/categories','/reports','/suggestions','/export','/import','/bills','/reconciliation','/household','/alerts','/settings','/profile','/audit','/subscription'];
 for(const route of routes){
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+route,{waitUntil:'networkidle'});
  await page.locator('aside').waitFor();
  const entry={route,headings:await page.locator('main h1, main h2').allTextContents(),buttons:await page.locator('main button').allTextContents(),viewports:[]};
  for(const width of [1920,1440,1366,1024,768,430,414,390,375,360]){
   await page.setViewportSize({width,height:width<768?844:900});
   await page.waitForTimeout(90);
   entry.viewports.push(await page.evaluate(()=>{
    const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    const interactive=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),textarea,[role=combobox]')].filter(visible);
    const unnamed=interactive.filter(e=>!(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.getAttribute('title')||(e.tagName!=='INPUT'&&e.tagName!=='TEXTAREA'&&e.textContent?.trim())||e.labels?.length));
    const clipped=interactive.filter(e=>{const r=e.getBoundingClientRect();return (r.right>innerWidth+2||r.left< -2)&&r.top>=0&&r.top<innerHeight&&!e.closest('[data-radix-scroll-area-viewport]');});
    return {width:innerWidth,rootOverflow:document.documentElement.scrollWidth-innerWidth,unnamed:unnamed.map(e=>e.outerHTML.slice(0,260)),clipped:clipped.map(e=>({text:e.textContent?.trim().slice(0,60),tag:e.tagName,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left})),mainTextLength:document.querySelector('main')?.textContent?.length};
   }));
   if([1440,390].includes(width)&&['/','/reports','/export','/household','/profile','/cards','/transactions','/settings','/savings'].includes(route))await page.screenshot({path:dir+'/screenshots/'+(route==='/'?'dashboard':route.slice(1))+'-'+width+'.png'});
  }
  result.pages.push(entry);console.log('PAGE',route,entry.headings.join(' | '),'widths',entry.viewports.length);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto(base+'/accounts',{waitUntil:'networkidle'});
 await page.locator('main').getByRole('button',{name:'New Account',exact:true}).first().click();
 await page.getByPlaceholder('HDFC Savings').fill('Audit UI Account');
 await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();
 await page.waitForTimeout(600);
 record('Create account persists visibly',await page.getByText('Audit UI Account',{exact:true}).first().isVisible(),await page.locator('main').innerText());
 await page.goto(base+'/export',{waitUntil:'networkidle'});
 const dlPromise=page.waitForEvent('download',{timeout:15000});
 await page.getByRole('button',{name:/download ca workbook/i}).click();
 const download=await dlPromise;await download.saveAs(dir+'/browser-ca-export.xlsx');
 const XLSX=require('xlsx');const wb=XLSX.readFile(dir+'/browser-ca-export.xlsx');record('CA download is a parseable XLSX',wb.SheetNames.length>10,wb.SheetNames);
 await page.setViewportSize({width:390,height:844});
 await page.locator('header button').first().click();
 await page.getByRole('dialog').waitFor();
 const mobileCommands=await page.getByRole('dialog').getByRole('button').allTextContents();
 record('Mobile command palette exposes Categories',mobileCommands.some(t=>/Go to Categories/.test(t)),mobileCommands);
 record('Mobile command palette exposes Audit',mobileCommands.some(t=>/Go to Audit/.test(t)),mobileCommands);
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Quick Add',exact:true}).click();await page.getByRole('menuitem',{name:'Expense',exact:true}).click();
 await page.getByRole('dialog').waitFor();await page.screenshot({path:dir+'/screenshots/quick-add-mobile.png'});
 record('Quick add dialog visible on mobile',await page.getByRole('dialog').isVisible(),await page.getByRole('dialog').boundingBox());
 await page.keyboard.press('Escape');record('Escape closes quick add dialog',!(await page.getByRole('dialog').isVisible()),await page.getByRole('dialog').count());
 await page.route('**/api/data/entity.php?collection=accounts',async route=>{if(route.request().method()==='POST')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Audit simulated offline failure'})});else await route.continue();});
 const loss=await page.evaluate(async()=>{
  const {accountRepo}=await import('/src/repositories/index.ts');const {getDB}=await import('/src/db/database.ts');
  const session=JSON.parse(localStorage.getItem('sv:session'));
  const entity=await accountRepo.create({userId:session.userId,data:{name:'Offline Audit Account',type:'cash',balance:0,balancePaise:0,openingBalance:0,openingBalancePaise:0,isDefault:0}});
  const before=!!await getDB().accounts.get(entity.id);await accountRepo.list(session.userId);const after=!!await getDB().accounts.get(entity.id);
  return {before,after,pending:localStorage.getItem('sparowvault_sync_outbox_v1')?.includes(entity.id)};
 });record('Cloud refresh preserves unsynced local account',loss.before&&loss.after,loss);
 await page.unrouteAll({behavior:'wait'});
 const adminContext=await browser.newContext({viewport:{width:1440,height:900}}),adminPage=await adminContext.newPage();
 await adminPage.goto(base+'/admin',{waitUntil:'networkidle'});
 await adminPage.locator('input').nth(0).fill('admin');await adminPage.locator('input[type=password]').fill('12345678');await adminPage.locator('form button[type=submit]').click();
 await adminPage.locator('aside').waitFor({timeout:30000});
 for(const route of ['/admin','/admin/users','/admin/plans','/admin/subscriptions','/admin/flags','/admin/branding']){
  await adminPage.goto(base+route,{waitUntil:'networkidle'});const entry={route,headings:await adminPage.locator('main h1,main h2').allTextContents(),buttons:await adminPage.locator('main button').allTextContents(),viewports:[]};
  for(const width of [1920,1440,1366,1024,768,430,414,390,375,360]){await adminPage.setViewportSize({width,height:900});await adminPage.waitForTimeout(50);entry.viewports.push(await adminPage.evaluate(()=>({width:innerWidth,rootOverflow:document.documentElement.scrollWidth-innerWidth,mainTextLength:document.querySelector('main')?.textContent?.length})));}
  result.pages.push(entry);
 }await adminPage.screenshot({path:dir+'/screenshots/admin-mobile.png'});await adminContext.close();
}catch(e){result.errors.push({fatal:true,message:e.stack});console.error(e);}finally{
 writeFileSync(dir+'/browser-audit.json',JSON.stringify(result,null,2));await browser.close();console.log('BROWSER AUDIT',result.pages.length,'pages',result.checks.length,'checks',result.errors.length,'errors');
}
