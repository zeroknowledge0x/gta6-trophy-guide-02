// Hand-off program for the gta6-trophy-guide-01 entry. Node 22, standard library only.
// It stages the two deliverables under MAKEFUN_OUTPUT_DIR (default /output) and writes the
// dossier the scorer reads with the vendored, byte-exact make.fun library.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Only text_max_bytes shapes the dossier bytes; the rest mirror the scorer's gate so a local
// run fails on the same inputs the scorer would refuse.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function ensureOutputDirectory(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function stageDirectory(source: string, target: string): void {
  if (!existsSync(source)) return;
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

function writeDossier(dir: string): string {
  const bytes = buildDossier(dir, dossierCaps);
  const path = join(dir, 'dossier.json');
  writeFileSync(path, bytes);
  return path;
}

function report(path: string): void {
  const size = statSync(path).size;
  console.log('dossier: ' + path + ' (' + size + ' bytes)');
}

function main(): void {
  ensureOutputDirectory(outDir);
  stageDirectory(join(repoDir, 'app'), join(outDir, 'app'));
  stageDirectory(join(repoDir, 'screenshots'), join(outDir, 'screenshots'));
  report(writeDossier(outDir));
}

main();
