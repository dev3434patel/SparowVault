/**
 * Minimal synthetic credit-card heading PDF (not bank-issued).
 * Used only to exercise document-class routing + destination UI.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const lines = [
  "BT /F1 18 Tf 50 750 Td (Credit Card Statement) Tj ET",
  "BT /F1 12 Tf 50 720 Td (SYNTHETIC FIXTURE - NOT BANK ISSUED) Tj ET",
  "BT /F1 11 Tf 50 690 Td (Minimum Amount Due: 500.00) Tj ET",
  "BT /F1 11 Tf 50 670 Td (Total Amount Due: 620.00) Tj ET",
  "BT /F1 10 Tf 50 630 Td (01/05/2026 PURCHASE STORE 500.00) Tj ET",
  "BT /F1 10 Tf 50 610 Td (02/05/2026 PAYMENT THANK YOU 800.00 CR) Tj ET",
];
const stream = lines.join("\n") + "\n";
const objs = [];
objs.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
objs.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
objs.push("3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n");
objs.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}endstream\nendobj\n`);
objs.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

let body = "%PDF-1.4\n";
const offsets = [0];
for (const o of objs) {
  offsets.push(Buffer.byteLength(body, "utf8"));
  body += o;
}
const xrefStart = Buffer.byteLength(body, "utf8");
body += `xref\n0 ${objs.length + 1}\n`;
body += "0000000000 65535 f \n";
for (let i = 1; i <= objs.length; i++) {
  body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
body += `trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
writeFileSync(join(dir, "credit-card-synthetic.pdf"), body);
console.log("wrote credit-card-synthetic.pdf");
