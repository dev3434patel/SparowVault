import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

// Pinned npm assets only. Runtime OCR never fetches a third-party worker or model.
export async function prepareOcr() {
  const root = new URL("../", import.meta.url);
  const target = new URL("public/ocr/7.0.0/", root);
  await mkdir(target, { recursive: true });
  await copyFile(new URL("node_modules/tesseract.js/dist/worker.min.js", root), new URL("worker.min.js", target));
  const core = new URL("node_modules/tesseract.js-core/", root);
  for (const file of await readdir(core)) {
    if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(file)) await copyFile(new URL(file, core), new URL(file, target));
  }
  await writeFile(new URL("eng.traineddata", target), gunzipSync(await readFile(new URL("node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", root))));
  await copyFile(new URL("node_modules/tesseract.js/LICENSE.md", root), new URL("LICENSE-tesseract.txt", target));
  await copyFile(new URL("LICENSE", core), new URL("LICENSE-core.txt", target));
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) await prepareOcr();
