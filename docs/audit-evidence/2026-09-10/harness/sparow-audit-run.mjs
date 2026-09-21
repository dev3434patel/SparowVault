import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [label, command, ...args] = process.argv.slice(2);
const dir = resolve('docs/audit-evidence/2026-09-10');
mkdirSync(dir, { recursive: true });
const started = new Date();
const child = spawn(command, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
let timedOut = false;
const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, Number(process.env.AUDIT_TIMEOUT_MS || 900000));
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { output += data; });
child.on('error', error => { output += String(error); });
child.on('close', (code, signal) => {
  clearTimeout(timeout);
  output = output.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]');
  const result = { label, command: [command, ...args], started: started.toISOString(), ended: new Date().toISOString(), seconds: (Date.now() - started.getTime()) / 1000, exitCode: code, signal, timedOut };
  writeFileSync(resolve(dir, label + '.log'), output);
  writeFileSync(resolve(dir, label + '.result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
  console.log(output.slice(-7000));
  process.exitCode = code ?? 1;
});
