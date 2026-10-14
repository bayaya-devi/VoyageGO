import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist');
const origin = process.env.PUBLIC_SITE_URL || 'https://voyagego-0fn.pages.dev';
const files = [
  'index.html', 'app.js', 'globe.js', 'horizons.js', 'go-design-system.css', 'styles.css', 'robots.txt', 'sitemap.xml', '_routes.json',
  'ordinateur-ar.js', 'ordinateur-en.js', 'ordinateur-es.js', 'ordinateur-fr.js', 'ordinateur-pt.js',
  'telephone-ar.js', 'telephone-en.js', 'telephone-es.js', 'telephone-fr.js', 'telephone-pt.js',
  'voyagego-icon.png', 'voyagego-logo.png', 'voyagego-logo-2x.png',
];

await mkdir(out, { recursive: true });
for (const file of files) await cp(resolve(root, file), resolve(out, file));
for (const directory of ['ar', 'en', 'es', 'fr', 'pt', 'data', 'geography', 'locales', 'assets']) {
  await cp(resolve(root, directory), resolve(out, directory), { recursive: true });
}
await mkdir(resolve(out, 'auth/i18n'), { recursive: true });
for (const file of ['auth/account-ui.js', 'auth/client.js', 'auth/validation.js']) await cp(resolve(root, file), resolve(out, file));
await cp(resolve(root, 'auth/i18n'), resolve(out, 'auth/i18n'), { recursive: true });
await mkdir(resolve(out, 'vendor'), { recursive: true });
await cp(resolve(root, 'vendor/three.module.js'), resolve(out, 'vendor/three.module.js'));
await cp(resolve(root, 'vendor/three.core.js'), resolve(out, 'vendor/three.core.js'));
await cp(resolve(root, 'vendor/THREE-LICENSE.txt'), resolve(out, 'vendor/THREE-LICENSE.txt'));
await build({
  entryPoints: [resolve(root, 'auth/auth-client-entry.js')],
  outfile: resolve(out, 'vendor/voyagego-auth-client.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
});

for (const file of ['index.html', 'fr/index.html', 'en/index.html', 'ar/index.html', 'es/index.html', 'pt/index.html', 'sitemap.xml', 'robots.txt']) {
  const path = resolve(out, file);
  const content = await readFile(path, 'utf8');
  await writeFile(path, content.replaceAll('https://bayaya-devi.github.io/VoyageGO', origin).replaceAll('https://bayaya-devi.github.io', origin));
}
console.log(`Built VoyageGo static assets for ${origin}.`);
