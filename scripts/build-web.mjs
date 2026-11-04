import { cp, mkdir, readdir, rm } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('output/web/', root);
const guide = new URL('guia/', output);

await rm(output, { recursive: true, force: true });
await mkdir(guide, { recursive: true });
for (const [from, to] of [
  ['web/index.html', 'index.html'],
  ['web/site.css', 'site.css'],
  ['public/favicon.svg', 'favicon.svg'],
  ['docs/GUIA_DE_USUARIO.html', 'guia/index.html'],
  ['docs/GUIA_DE_USUARIO.pdf', 'guia/GUIA_DE_USUARIO.pdf']
]) {
  await cp(new URL(from, root), new URL(to, output));
}

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
