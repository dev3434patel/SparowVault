import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const dir='docs/audit-evidence/2026-09-10',inv=JSON.parse(readFileSync(dir+'/source-inventory.json'));
const names=['CURRENT-FULL-A-TO-Z-AUDIT-REPORT.md','MODULE-WISE-AUDIT.md','API-AUDIT.md','UI-UX-AUDIT.md','FINANCE-CALCULATION-AUDIT.md','RBAC-SECURITY-AUDIT.md','BUGS-AND-GAPS-REPORT.md','TESTING-COVERAGE-REPORT.md','PRODUCTION-READINESS-REPORT.md'];
const changedScannedFiles=inv.files.filter(f=>!existsSync(f.file)||createHash('sha256').update(readFileSync(f.file)).digest('hex')!==f.sha256).map(f=>f.file);
const brokenLinks=[],invalidLineLinks=[],reports=[];
for(const name of names){const s=readFileSync('docs/'+name,'utf8');reports.push({name,lines:s.split('\n').length,sha256:createHash('sha256').update(s).digest('hex')});for(const m of s.matchAll(/\]\(<([^>]+)>\)/g)){const p=m[1].replace(/:\d+$/,'');if(!existsSync(p))brokenLinks.push({name,path:p});else {const n=m[1].match(/:(\d+)$/)?.[1];if(n&&Number(n)>readFileSync(p,'utf8').split('\n').length)invalidLineLinks.push({name,path:m[1]});}}}
const files=JSON.parse(readFileSync(dir+'/findings.json'));
const counts=Object.fromEntries(['Critical','High','Medium','Low'].map(k=>[k,files.filter(f=>f.severity===k).length]));
const network={};for(const port of [5173,8080,5176,8086]){try{const r=await fetch('http://localhost:'+port+(port===8080||port===8086?'/api/health.php':'/'),{signal:AbortSignal.timeout(3000)});network[port]={status:r.status,...(port===8080?{health:await r.json()}:{})};}catch{network[port]={reachable:false};}}
let whitespace;try{execFileSync('git',['diff','--check'],{encoding:'utf8'});whitespace='clean';}catch(e){whitespace=String(e.stdout).trim();}
const out={date:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),remoteMaster:execFileSync('git',['ls-remote','origin','refs/heads/master'],{encoding:'utf8'}).trim().split(/\s/)[0],changedScannedFiles,brokenLinks,invalidLineLinks,mainSections:[...readFileSync('docs/'+names[0],'utf8').matchAll(/^## (\d+)\./gm)].map(m=>Number(m[1])),findings:files.length,counts,reports,network,preexistingWhitespaceWarning:whitespace,trackedDiff:execFileSync('git',['diff','--stat'],{encoding:'utf8'}).trim()};
writeFileSync(dir+'/audit-workspace-verification.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(changedScannedFiles.length||brokenLinks.length||invalidLineLinks.length||out.mainSections.length!==25||out.remoteMaster!==out.head)process.exitCode=1;
