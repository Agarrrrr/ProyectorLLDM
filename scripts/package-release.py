"""Build a clean cross-platform distribution (Windows, macOS, Linux) from the current source and factory catalogs."""

import json
import re
import time
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
if not re.fullmatch(r'\d+\.\d+\.\d+', version):
    raise ValueError('Se necesita una versión estable en package.json.')

files = {
    'server.js', 'package.json', 'package-lock.json', 'README.md', 'PATCHNOTES.md', 'LICENSE',
    'Iniciar Proyector LLDM.bat', 'iniciar_cabina.bat', 'Activar Inicio Automatico al Prender PC.bat',
    'Iniciar Proyector LLDM.command', 'Iniciar Proyector LLDM.sh',
    'config/obs.example.json', 'config/releases.json', 'docs/GUIA_DE_USUARIO.pdf',
    'docs/GUIA_DE_USUARIO.html', 'docs/GUIA_DE_USUARIO_PORTATIL.html', 'docs/GUIA_DE_USUARIO.md',
    'docs/ACTUALIZACIONES.md', 'docs/CONEXION_LOCAL.md', 'docs/RENDIMIENTO.md', 'docs/SALIDA_16_9.md',
    'lista-oraciones/README.md',
    'data/factory/himnario_lldm.json', 'data/factory/coro_lldm.json',
}
for folder in ['src', 'public', 'lista-oraciones/dist', 'docs/capturas', 'docs/animaciones', 'data/factory/biblia']:
    for file in (ROOT / folder).rglob('*'):
        if file.is_file():
            relative = file.relative_to(ROOT).as_posix()
            if not relative.startswith('public/uploads/'):
                files.add(relative)

posix_executables = {'Iniciar Proyector LLDM.command', 'Iniciar Proyector LLDM.sh'}

output = ROOT / 'output' / f'Proyector-LLDM-{version}.zip'
output.parent.mkdir(exist_ok=True)
temporary = output.with_suffix('.zip.tmp')
with ZipFile(temporary, 'w', compression=ZIP_DEFLATED) as archive:
    for relative in sorted(files):
        source = ROOT / relative
        arcname = f'Proyector-LLDM-{version}/{relative}'
        stat = source.stat()
        info = ZipInfo(arcname, time.localtime(stat.st_mtime)[:6])
        info.compress_type = ZIP_DEFLATED
        info.create_system = 3  # Unix-compatible permissions in ZIP
        data = source.read_bytes()
        if relative in posix_executables:
            data = data.replace(b'\r\n', b'\n')
            info.external_attr = (0o100755 << 16)
        else:
            info.external_attr = (0o100644 << 16)
        archive.writestr(info, data)
temporary.replace(output)
print(output)
