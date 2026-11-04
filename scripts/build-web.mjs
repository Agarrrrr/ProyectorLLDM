import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const output = new URL('output/web/', root);
const guide = new URL('guia/', output);

await rm(output, { recursive: true, force: true });
await mkdir(guide, { recursive: true });
for (const [from, to] of [
  ['web/lite.html', 'index.html'],
  ['web/lite.css', 'lite.css'],
  ['public/styles/operator-controls.css', 'styles/operator-controls.css'],
  ['public/favicon.svg', 'favicon.svg'],
  ['public/pantalla.html', 'pantalla.html'],
  ['public/pantalla', 'pantalla'],
  ['public/idle.html', 'idle.html'],
  ['public/idle', 'idle'],
  ['public/fonts', 'fonts'],
  ['public/graphics', 'graphics'],
  ['public/fondo1b.jpg', 'fondo1b.jpg'],
  ['public/output-viewport.js', 'output-viewport.js'],
  ['public/output-viewport.css', 'output-viewport.css'],
  ['public/logo_lldm_oficial.svg', 'logo_lldm_oficial.svg'],
  ['public/Recurso-6fondo.svg', 'Recurso-6fondo.svg'],
  ['data/factory/himnario_lldm.json', 'catalogos/hymn.json'],
  ['data/factory/coro_lldm.json', 'catalogos/choir.json'],
  ['data/factory/biblia/RVR1960.json', 'catalogos/RVR1960.json'],
  ['docs/GUIA_DE_USUARIO.html', 'guia/index.html'],
  ['docs/GUIA_DE_USUARIO.pdf', 'guia/GUIA_DE_USUARIO.pdf']
]) {
  await cp(new URL(from, root), new URL(to, output), { recursive: true });
}

await build({
  entryPoints: [fileURLToPath(new URL('web/lite.js', root))],
  outfile: fileURLToPath(new URL('lite.js', output)),
  bundle: true,
  minify: true,
  plugins: [{
    name: 'browser-font-measurement',
    setup(plugin) {
      plugin.onResolve({ filter: /^\.\/font-metrics$/ }, () => ({
        path: fileURLToPath(new URL('web/lite-font-metrics.cjs', root))
      }));
    }
  }]
});

for (const [folder, allowed] of [
  ['capturas', /^\d{2}-[\w-]+\.png$/],
  ['animaciones', /^(?:interfaz-ajustes|obs-angular|obs-classic)\.(?:png|gif)$/]
]) {
  await mkdir(new URL(folder + '/', guide));
  for (const entry of await readdir(new URL('docs/' + folder, root), { withFileTypes: true })) {
    if (entry.isFile() && allowed.test(entry.name)) {
      await cp(new URL('docs/' + folder + '/' + entry.name, root), new URL(folder + '/' + entry.name, guide));
    }
  }
}
