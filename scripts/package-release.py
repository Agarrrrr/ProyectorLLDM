"""Build a clean Windows distribution from the current source and factory catalogs."""

import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise ValueError('Se necesita una versión estable en package.json.')

files = {
    'server.js', 'package.json', 'package-lock.json', 'README.md', 'PATCHNOTES.md', 'LICENSE',
    'Iniciar Proyector LLDM.bat', 'iniciar_cabina.bat', 'Activar Inicio Automatico al Prender PC.bat',
    'config/obs.example.json', 'config/releases.json', 'docs/GUIA_DE_USUARIO.pdf',
    'docs/GUIA_DE_USUARIO.html', 'docs/GUIA_DE_USUARIO_PORTATIL.html', 'docs/GUIA_DE_USUARIO.md',
    'docs/ACTUALIZACIONES.md', 'docs/CONEXION_LOCAL.md', 'docs/RENDIMIENTO.md', 'docs/SALIDA_16_9.md',
    'lista-oraciones/README.md',
    'data/factory/himnario_lldm.json', 'data/factory/coro_lldm.json',
}
for folder in ['src', 'public', 'lista-oraciones/dist', 'docs/capturas', 'docs/animaciones']:
    for file in (ROOT / folder).rglob('*'):
        if file.is_file():
            relative = file.relative_to(ROOT).as_posix()
            if not relative.startswith('public/uploads/'):
                files.add(relative)

output = ROOT / 'output' / f'Proyector-LLDM-{version}.zip'
output.parent.mkdir(exist_ok=True)
temporary = output.with_suffix('.zip.tmp')
with ZipFile(temporary, 'w', compression=ZIP_DEFLATED) as archive:
    for relative in sorted(files):
        archive.write(ROOT / relative, f'Proyector-LLDM-{version}/{relative}')
temporary.replace(output)
print(output)
