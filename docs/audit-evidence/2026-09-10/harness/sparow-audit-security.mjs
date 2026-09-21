import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require=createRequire(process.cwd()+'/package.json');
const mysql=require('mysql2/promise');
const db=await mysql.createConnection({host:'127.0.0.1',user:'root',password:'',database:'sparowvault_audit_test_20260910'});
const base='http://localhost:8086', rows=[];
function record(id,name,expected,actual,pass){rows.push({id,name,expected,actual,pass});console.log(pass?'PASS':'FAIL',id,name,JSON.stringify(actual));}
async function req(path,{method='GET',body,auth,csrf=false,cookieOnly=false,extra={}}={}){
 const headers={'Content-Type':'application/json',...extra};
 if(auth){if(cookieOnly)headers.Cookie='sv_auth='+auth.token;else headers.Authorization='Bearer '+auth.token;}
 if(csrf&&auth){headers.Cookie=(headers.Cookie?headers.Cookie+'; ':'')+'sv_csrf='+auth.csrfToken;headers['X-CSRF-Token']=auth.csrfToken;}
 const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 let json;try{json=await r.json();}catch{json=null;}
 return {status:r.status,json};
}
const policies=(await req('/api/policies/current.php')).json.data.versions;
const username='audit_'+Date.now().toString(36);
const reg=await req('/api/auth/register.php',{method:'POST',body:{username,displayName:'Audit Fixture',pin:'583921',policyAcceptances:['terms','privacy'].map(key=>({key,version:policies[key]}))}});
const a=reg.json.data, uid=a.user.id;
const create=(collection,data,opts={})=>req('/api/data/entity.php?collection='+collection,{method:'POST',auth:a,body:{userId:uid,data,...opts}});
const baseEntity={userId:uid,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),isDeleted:0,version:1,tags:[],notes:''};
try{
 let r=await req('/api/admin/users.php',{auth:a});record('S01','ordinary user cannot list platform users','non-2xx',r.status,r.status>=400);
 r=await req('/api/auth/profile.php',{method:'PATCH',auth:a,cookieOnly:true,extra:{Origin:'https://audit-untrusted.example'},body:{displayName:'Cookie mutation probe',mobile:'',email:''}});record('S02','cookie mutation requires CSRF','403',r.status,r.status===403);
 r=await req('/api/cloud/sync/push.php',{method:'POST',auth:a,body:{collections:{}}});record('S03','sync push rejects absent CSRF','403',r.status,r.status===403);
 await req('/api/auth/security-recovery.php',{method:'POST',auth:a,body:{securityQuestion:'Fixture recovery question',securityAnswer:'violet'}});
 r=await req('/api/auth/change-pin.php',{method:'POST',auth:a,body:{currentPin:'583921',newPin:'674532'}});record('S04','PIN changes with valid current PIN','200',r.status,r.status===200);
 r=await req('/api/auth/reset-pin.php',{method:'POST',auth:a,body:{securityAnswer:'violet',newPin:'583921'}});record('S05','recovery answer survives PIN change','200',r.status,r.status===200);
 r=await req('/api/auth/me.php',{auth:a});record('S06','previous session revoked after PIN change','401',r.status,r.status===401);
 await req('/api/auth/logout.php',{method:'POST',auth:a});r=await req('/api/auth/me.php',{auth:a});record('S07','logged out bearer token revoked','401',r.status,r.status===401);
 const admin=(await req('/api/auth/admin-login.php',{method:'POST',body:{username:'admin',pin:'12345678'}})).json?.data;
 if(admin){const [flag]=await db.query("SELECT must_change_pin FROM users WHERE username='admin'");r=await req('/api/admin/users.php',{auth:admin});record('S08','seed admin forced to rotate PIN before privileged API','deny while must_change_pin=1',{flag:flag[0].must_change_pin,status:r.status},flag[0].must_change_pin===1&&r.status>=400);}
 const cat=(await create('categories',{name:'Original',appliesTo:'expense',icon:'tag',color:'#ef4444'})).json.data;
 await req('/api/data/entity-item.php?collection=categories&id='+cat.id,{method:'PATCH',auth:a,body:{patch:{isDeleted:1}}});
 r=await req('/api/cloud/sync/push.php',{method:'POST',auth:a,csrf:true,body:{collections:{categories:[cat]}}});
 const restored=await req('/api/data/entity-item.php?collection=categories&id='+cat.id,{auth:a});record('S09','stale sync cannot resurrect a deleted record','conflict or deleted',{push:r.status,isDeleted:restored.json?.data?.isDeleted},r.status===409||restored.json?.data?.isDeleted===1);
 const account=(await create('accounts',{name:'Fixture Cash',type:'cash',openingBalance:0,openingBalancePaise:0,balance:0,balancePaise:0,isDefault:0})).json.data;
 const tx={...baseEntity,id:'audit_tx_'+Date.now(),type:'expense',amount:10,amountPaise:1000,accountId:account.id,categoryId:cat.id,date:'2026-09-01T10:00:00.000Z',paymentMode:'cash',merchantOrPerson:'Fixture',description:'Audit expense',billAvailable:0,gstApplicable:0,taxFlag:0,businessOrPersonal:'personal',needWant:'unassigned',fixedVariable:'unassigned',plannedUnplanned:'unassigned'};
 r=await req('/api/cloud/sync/push.php',{method:'POST',auth:a,csrf:true,body:{collections:{transactions:[tx,{...tx,id:tx.id+'_invalid',amountPaise:-1}]}}});
 const first=await req('/api/data/entity-item.php?collection=transactions&id='+tx.id,{auth:a});record('S10','invalid batch leaves no partial financial writes','422 and first row absent',{status:r.status,firstRowStatus:first.status},r.status===422&&first.status===404);
 const house=(await create('households',{name:'Audit House',defaultCurrency:'INR'})).json.data;
 const member=(await create('householdMembers',{householdId:house.id,role:'viewer',displayName:'Viewer Fixture'})).json.data;
 const patchOne=await req('/api/data/entity-item.php?collection=householdMembers&id='+member.id,{method:'PATCH',auth:a,body:{patch:{role:'owner'}}});
 const patchMany=await req('/api/data/entity.php?collection=householdMembers',{method:'PATCH',auth:a,body:{ids:[member.id],patch:{role:'owner'}}});record('S11','batch PATCH preserves household viewer restrictions','both denied',{single:patchOne.status,batch:patchMany.status},patchOne.status>=400&&patchMany.status>=400);
 const attempts=[];for(let i=0;i<7;i++){const r=await req('/api/auth/login.php',{method:'POST',body:{username,pin:'999888'},extra:{'X-Forwarded-For':'198.51.100.'+(20+i)}});attempts.push(r.status);}
 record('S12','forwarded-IP spoofing cannot evade account lockout','rate limit/lockout by attempt 6',attempts,attempts.slice(5).some(s=>s===429));
 const fakeAudit=await create('auditLogs',{action:'invented audit action',entity:'User',entityId:uid,detail:'Synthetic evidence tampering probe'});
 record('S13','client cannot create authoritative-looking audit trail','reject fabricated audit records',fakeAudit.status,fakeAudit.status>=400);
 const mutation='race_'+Date.now();await Promise.all(Array.from({length:24},(_,i)=>create('categories',{id:'race_'+mutation+'_'+i,name:'Race '+i,appliesTo:'expense',icon:'tag',color:'#ef4444'},{mutationId:mutation})));
 const [race]=await db.query("SELECT COUNT(*) AS n FROM cloud_collection_rows WHERE user_id=? AND collection_name='categories' AND entity_id LIKE ?",[uid,'race_'+mutation+'_%']);record('S14','concurrent duplicate mutation has one durable record',1,Number(race[0].n),Number(race[0].n)===1);
 const [before]=await db.query('SELECT COUNT(*) n FROM financial_events WHERE user_id=?',[uid]);
 await req('/api/data/entity.php?collection=transactions&userId='+uid,{method:'DELETE',auth:a});
 const [after]=await db.query('SELECT COUNT(*) n FROM financial_events WHERE user_id=?',[uid]);record('S15','bulk hard-delete reconciles persisted financial events','no posted orphan events',{before:before[0].n,after:after[0].n},Number(after[0].n)===0);
 for(const path of ['/.git/HEAD','/.env','/package.json','/src/App.tsx','/sql/schema.sql']){const r=await fetch(base+path);await r.text();record('HTTP'+path,'project internal file exposure','deny sensitive/internal file',r.status,r.status>=400);}
}finally{writeFileSync('docs/audit-evidence/2026-09-10/security-probes.json',JSON.stringify({date:new Date().toISOString(),database:'sparowvault_audit_test_20260910',rows},null,2));await db.end();}
