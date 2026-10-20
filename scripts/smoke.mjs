/**
 * Smoke test of the *packed* package: installs the tarball into a fresh temporary project
 * and loads it as ESM and as CommonJS (both entry points).
 *
 * Usage: node scripts/smoke.mjs [path/to/cambodia-geo-x.y.z.tgz]
 * Without an argument it runs `npm pack` first (and removes the tarball afterwards).
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let tarball = process.argv[2] ? path.resolve(process.argv[2]) : null;
let packedHere = false;

if (!tarball) {
  const out = execSync('npm pack --silent', { cwd: root, encoding: 'utf8' }).trim().split('\n');
  tarball = path.join(root, out[out.length - 1].trim());
  packedHere = true;
}

const dir = mkdtempSync(path.join(os.tmpdir(), 'cambodia-geo-smoke-'));
try {
  execSync('npm init -y', { cwd: dir, stdio: 'ignore' });
  execSync(`npm install "${tarball}" --no-audit --no-fund`, { cwd: dir, stdio: 'inherit' });

  const checks = `
    const assert = (c, m) => { if (!c) throw new Error('smoke test failed: ' + m); };
    const check = (kh, label) => {
      assert(kh.provinces().length > 0, label + ' provinces');
      const first = kh.provinces()[0];
      assert(kh.getProvince(first.code) && kh.getProvince(first.code).code === first.code, label + ' getProvince');
      assert(kh.districts(first.code).length > 0, label + ' districts');
      assert(typeof kh.DATA_YEAR === 'number', label + ' DATA_YEAR');
      return kh;
    };
  `;
  writeFileSync(
    path.join(dir, 'check.cjs'),
    `${checks}
    const full = check(require('cambodia-geo'), 'cjs');
    assert(full.search('a', { level: 'village', limit: 1 }).length > 0, 'cjs villages');
    const lite = check(require('cambodia-geo/lite'), 'cjs lite');
    assert(lite.villages === undefined, 'lite must not expose villages');
    console.log('CommonJS OK, version ' + full.VERSION + ', data ' + full.DATA_YEAR);
    `,
  );
  const esm = `import * as full from 'cambodia-geo';\nimport * as lite from 'cambodia-geo/lite';\n${checks}
    check(full, 'esm');
    assert(full.search('a', { level: 'village', limit: 1 }).length > 0, 'esm villages');
    check(lite, 'esm lite');
    assert(lite.villages === undefined, 'lite must not expose villages');
    console.log('ESM OK, version ' + full.VERSION + ', data ' + full.DATA_YEAR);
  `;
  writeFileSync(path.join(dir, 'check.mjs'), esm);

  execSync('node check.cjs', { cwd: dir, stdio: 'inherit' });
  execSync('node check.mjs', { cwd: dir, stdio: 'inherit' });
  console.log('smoke test passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
  if (packedHere) rmSync(tarball, { force: true });
}
