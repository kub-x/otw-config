// Validates config.json and writes what GitHub Pages serves (README.md): site/app-config.json, the config with
// "issued" (the commit's time, so a newer config always has a later one), and site/app-config.json.sig, its ECDSA P-256
// SHA-256 signature (DER, base64) made with the private key in OTW_CONFIG_SIGNING_KEY (PEM). Without the key (a PR),
// it validates only.
//
//   node scripts/publish.mjs [--issued 2026-11-08T19:00:00Z]
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const fail = (m) => { console.error(`config.json: ${m}`); process.exit(1); };
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const keys = ['schema', 'ios', 'android', 'message'];
for (const k of Object.keys(config)) if (!keys.includes(k)) fail(`unknown key "${k}"`);
if (config.schema !== 1) fail('schema must be 1');
if (typeof config.message !== 'string' || !config.message.trim()) fail('message must be a non-empty text');
for (const p of ['ios', 'android']) {
  const c = config[p];
  if (!c || typeof c !== 'object') fail(`${p} is missing`);
  for (const k of Object.keys(c)) if (!['minimumBuild', 'blockedBuilds', 'updateUrl'].includes(k)) fail(`${p}: unknown key "${k}"`);
  if (!Number.isInteger(c.minimumBuild) || c.minimumBuild < 0) fail(`${p}.minimumBuild must be a whole number ≥ 0`);
  if (!Array.isArray(c.blockedBuilds) || !c.blockedBuilds.every((b) => Number.isInteger(b) && b > 0)) fail(`${p}.blockedBuilds must be build numbers`);
  if (c.updateUrl !== null && !/^https:\/\/\S+$/.test(c.updateUrl ?? '')) fail(`${p}.updateUrl must be an https URL or null`);
}

const arg = process.argv.indexOf('--issued');
const issued = arg > 0 ? process.argv[arg + 1]
  : new Date(Number(execFileSync('git', ['log', '-1', '--format=%ct'], { encoding: 'utf8' }).trim()) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const published = `${JSON.stringify({ schema: 1, issued, ios: config.ios, android: config.android, message: config.message }, null, 2)}\n`;
console.log(published);

const key = process.env.OTW_CONFIG_SIGNING_KEY;
if (!key) { console.log('Valid. No OTW_CONFIG_SIGNING_KEY: not signed.'); process.exit(0); }
const signature = crypto.sign('sha256', Buffer.from(published), key).toString('base64');
const publicKey = crypto.createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64');
if (!crypto.verify('sha256', Buffer.from(published), crypto.createPublicKey(key), Buffer.from(signature, 'base64'))) fail('signature does not verify');
fs.mkdirSync('site', { recursive: true });
fs.writeFileSync('site/app-config.json', published);
fs.writeFileSync('site/app-config.json.sig', `${signature}\n`);
fs.writeFileSync('site/index.html', '<!doctype html><title>otw-config</title><p>Out of this World app config: <a href="app-config.json">app-config.json</a>.</p>\n');
console.log(`Signed with the key whose public part is ${publicKey}`);
