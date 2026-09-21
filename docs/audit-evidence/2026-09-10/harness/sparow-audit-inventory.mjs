import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
const root=process.cwd(), dir=resolve('docs/audit-evidence/2026-09-10');
mkdirSync(dir,{recursive:true});
const require=createRequire(resolve('package.json')), ts=require('typescript');
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name.startsWith('._')||['node_modules','.git','dist','release','backups','artifacts','audit-evidence','evidence-final'].includes(e.name)?[]:e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const files=['src','api','php','tests','scripts','sql'].flatMap(walk).filter(f=>/\.(tsx?|m?[jc]s|php|sql|json)$/.test(f));
const sources=files.filter(f=>!f.startsWith('sql/')&&!f.includes('/__tests__/')&&!f.startsWith('tests/')&& !f.endsWith('.json'));
const functions=[],actions=[],pages=[],keywords=[],types=[];
const tests=files.filter(f=>f.includes('.test.')||(/tests\//.test(f)&&/e2e|runtime-browser|sql-smoke/.test(f)));
const content=Object.fromEntries(files.map(f=>[f,readFileSync(f,'utf8')]));
const line=(sf,n)=>sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
const short=s=>s.replace(/\s+/g,' ').trim();
for(const file of sources){
 const text=content[file];
 text.split('\n').forEach((s,i)=>{const tags=[...new Set((s.match(/\b(?:TODO|FIXME|HACK|temporary|mock|static|hardcoded|placeholder|demo|localStorage)\b|console\.log/g)||[]))]; if(tags.length)keywords.push({file,line:i+1,tags,source:s.trim()});});
 if(/\.tsx?$/.test(file)){
  const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const imports=[],fields=[],headings=[],calls=[];
  function visit(n){
   if(ts.isImportDeclaration(n))imports.push({module:n.moduleSpecifier.text,bindings:n.importClause?.getText(sf)||''});
   const isNamed=ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n)||(ts.isVariableDeclaration(n)&&n.initializer&&(ts.isArrowFunction(n.initializer)||ts.isFunctionExpression(n.initializer)))||(ts.isPropertyAssignment(n)&&(ts.isArrowFunction(n.initializer)||ts.isFunctionExpression(n.initializer)));
   if(isNamed)functions.push({file,line:line(sf,n),name:n.name?.getText(sf)||'(anonymous)',signature:short(n.getText(sf).split('{')[0]),lines:n.getText(sf).split('\n').length});
   if(ts.isInterfaceDeclaration(n))types.push({file,line:line(sf,n),name:n.name.text,fields:n.members.map(m=>m.getText(sf))});
   if(ts.isCallExpression(n))calls.push({line:line(sf,n),name:n.expression.getText(sf),args:n.arguments.map(a=>short(a.getText(sf)).slice(0,350))});
   if(ts.isJsxElement(n)||ts.isJsxSelfClosingElement(n)){
    const open=ts.isJsxElement(n)?n.openingElement:n,tag=open.tagName.getText(sf);
    const props=Object.fromEntries(open.attributes.properties.filter(ts.isJsxAttribute).map(a=>[a.name.getText(sf),a.initializer?.getText(sf)||'true']));
    const label=ts.isJsxElement(n)?short(n.children.map(c=>ts.isJsxText(c)?c.text:ts.isJsxExpression(c)?'{'+short(c.expression?.getText(sf)||'')+'}':'').join(' ')):'';
    if(['Button','button','DropdownMenuItem','DropdownItem','TabsTrigger','a','Switch','Checkbox'].includes(tag)||props.onClick||props.onSubmit){
      const conditions=[]; let p=n.parent; while(p){if(ts.isConditionalExpression(p)||ts.isBinaryExpression(p)&&p.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)conditions.push(short(p.getText(sf)).slice(0,250));p=p.parent;}
      actions.push({file,line:line(sf,n),tag,label:label||props['aria-label']||props.title||'(icon/dynamic)',props,conditions});
    }
    if(['Field','Input','Select','textarea','input','SelectItem'].includes(tag))fields.push({line:line(sf,n),tag,label,props});
    if(['PageHeader','CardTitle','DialogTitle','h1','h2','h3'].includes(tag))headings.push({line:line(sf,n),tag,label,props});
   }
   ts.forEachChild(n,visit);
  }
  visit(sf);
  if(file.includes('components/'))pages.push({file,imports,fields,headings,calls});
 }else if(file.endsWith('.php')){
  for(const m of text.matchAll(/^function\s+(\w+)\s*\([^]*?(?=^function\s|$(?![^]))/gm)){
   const body=m[0],name=m[1];
   functions.push({file,line:text.slice(0,m.index).split('\n').length,name,signature:short(body.split('{')[0]),lines:body.split('\n').length,body});
  }
 }
}
const phpFunctions=new Map(functions.filter(f=>f.file.endsWith('php')).map(f=>[f.name,f]));
const endpoints=files.filter(f=>f.startsWith('api/')&&f.endsWith('.php')).map(file=>{
 const text=content[file];
 const handlers=[...phpFunctions.keys()].filter(f=>new RegExp('\\b'+f+'\\s*\\(').test(text));
 const graph=new Set();
 function expand(name,depth){if(graph.has(name)||depth>5)return; graph.add(name);const body=phpFunctions.get(name)?.body||'';for(const f of phpFunctions.keys())if(new RegExp('\\b'+f+'\\s*\\(').test(body))expand(f,depth+1);}
 handlers.forEach(h=>expand(h,0));
 const direct=text+'\n'+handlers.map(h=>phpFunctions.get(h)?.body||'').join('\n');
 return {path:'/'+file,file,methods:[...new Set([...text.matchAll(/["'](GET|POST|PUT|PATCH|DELETE)["']/g)].map(m=>m[1]))],handlers,auth:graph.has('auth_require_admin')?'admin':graph.has('auth_require_active_user')?'active user':'public/special',csrf:graph.has('csrf_require_for_mutations'),pin:[...graph].filter(n=>/pin_reentry/.test(n)),rate:[...graph].some(n=>n==='rate_limit_guard'),audit:[...graph].filter(n=>/audit.*log|audit.*change/.test(n)),fields:[...new Set([...direct.matchAll(/\$body\[["']([^"']+)["']\]/g)].map(m=>m[1]))],queries:[...new Set([...direct.matchAll(/\$_GET\[["']([^"']+)["']\]/g)].map(m=>m[1]))],errors:[...new Set([...direct.matchAll(/json_error\([^;]+/g)].map(m=>short(m[0])))],referencedTests:tests.filter(f=>content[f]?.includes('/'+file)||handlers.some(h=>content[f]?.includes(h))),callGraph:[...graph]};
});
const manifest=files.map(f=>({file:f,bytes:Buffer.byteLength(content[f]),lines:content[f].split('\n').length,sha256:createHash('sha256').update(content[f]).digest('hex')}));
const report={date:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:manifest,counts:{files:files.length,sourceFiles:sources.length,pageComponents:pages.filter(p=>p.file.includes('/pages/')).length,apiPhpFiles:endpoints.length,unitFiles:tests.filter(f=>f.includes('.test.')).length,testEntryFiles:tests.length,serviceFiles:sources.filter(f=>f.startsWith('src/services/')).length,helperFiles:sources.filter(f=>f.startsWith('php/helpers/')).length,namedFunctions:functions.length,actionDefinitions:actions.length,todoFixme:keywords.filter(k=>k.tags.some(t=>['TODO','FIXME','HACK'].includes(t))).length},endpoints,functions: functions.map(({body,...f})=>f),pages,actions,types,keywords,tests};
writeFileSync(dir+'/source-inventory.json',JSON.stringify(report,null,2)+'\n');
writeFileSync(dir+'/php-functions.json',JSON.stringify(functions.filter(f=>f.file.endsWith('php')),null,2)+'\n');
const esc=s=>String(s??'').replace(/\|/g,'\\|').replace(/\n/g,' ');
const table=(headers,rows)=>'| '+headers.join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.map(esc).join(' | ')+' |').join('\n')+'\n';
writeFileSync(dir+'/ACTION-INVENTORY.md','# Source Action Inventory\n\n2026-09-10. AST-extracted definitions, not executed clicks. Repeated mapped controls count once; dynamic labels are expressions. API/PIN/audit behavior must be traced through the named handlers in the module report. All raw props and ancestor conditions are in source-inventory.json.\n\n'+table(['Source','Control/label','Handler','Disabled condition','Visibility context'],actions.map(a=>[a.file+':'+a.line,a.tag+' '+a.label,a.props.onClick||a.props.onSubmit||a.props.onCheckedChange||a.props.href||'parent/trigger',a.props.disabled||'none on element',a.conditions.join('; ')||'parent module gate'])));
writeFileSync(dir+'/FUNCTION-INVENTORY.md','# Function Inventory\n\nNamed TypeScript functions, arrow assignments, methods, and top-level PHP functions. Anonymous callbacks are not counted. Inventory does not imply every function has a behavioral test.\n\n'+table(['Source','Function','Signature','Lines'],functions.map(f=>[f.file+':'+f.line,f.name,f.signature,f.lines])));
writeFileSync(dir+'/ENDPOINT-INVENTORY.md','# API File Inventory\n\nStatic entry-point extraction. Methods are literals found in each wrapper; health.php is GET by convention but has no method guard. Aliases and controller-specific security caveats are in API-AUDIT.md. A helper appearing in the call graph does not prove it is executed on every branch. Test references are textual candidates, not coverage measurements.\n\n'+table(['Endpoint','Methods','Handlers','Auth','CSRF helper reachable','Body fields','Query','Audit helpers','Candidate tests'],endpoints.map(e=>[e.path,e.methods.join(',')||'unguarded',e.handlers.join(', '),e.auth,e.csrf?'yes':'no',e.fields.join(', '),e.queries.join(', '),e.audit.join(', ')||'none',e.referencedTests.join(', ')||'none'])));
writeFileSync(dir+'/KEYWORD-INVENTORY.md','# Source Keyword Inventory\n\nMatches are review leads, not automatic defects. `static`, HTML placeholders, demo fixtures, and localStorage uses can be intentional.\n\n'+table(['Source','Keywords','Line'],keywords.map(k=>[k.file+':'+k.line,k.tags.join(', '),k.source])));
console.log(JSON.stringify(report.counts));
