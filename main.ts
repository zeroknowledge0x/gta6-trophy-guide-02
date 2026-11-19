// Leonida Legends entry builder — Node 22, standard library only, no build step.
// It hands in the two things an entry is made of: app/ (the offline guide, plain static
// files the browser opens at app/index.html) and screenshots/ (four real renders). Then
// it asks make.fun's vendored library for dossier.json, the deterministic summary the
// judge reads. Nothing here touches the network; copy and hashing are local disk work.

import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Keep these identical to the bounty's gate caps so our dossier is byte-for-byte the
// same one the scorer builds from the same directory.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

const REPO_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

/** Copy one directory tree, creating the destination when it is absent. */
function copyTree(from, to) {
  if (!existsSync(from)) return false;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true, force: true });
  return true;
}

/** Copy app/ and screenshots/ into the output directory, preserving structure. */
function stageEntry(repoDir, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoDir, 'app'), join(outputDir, 'app'));
  copyTree(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'));
}

/** Build the dossier from the staged directory and return its absolute path and size. */
function writeDossier(outputDir) {
  const bytes = buildDossier(outputDir, DOSSIER_CAPS);
  const path = join(outputDir, 'dossier.json');
  writeFileSync(path, bytes);
  return { path, size: statSync(path).size };
}

stageEntry(REPO_DIR, OUTPUT_DIR);
const dossier = writeDossier(OUTPUT_DIR);

// Read the file back once so the printed size is the size actually on disk.
const onDisk = readFileSync(dossier.path).length;
console.log(`dossier: ${dossier.path} (${onDisk} bytes)`);
