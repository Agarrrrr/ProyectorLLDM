from pathlib import Path
import re
import html
import base64
import struct

motion_examples = [
    ('obs-classic', 'Banner clásico', 'Entrada y salida del banner clásico con una referencia bíblica.'),
    ('obs-angular', 'Paneles angulares', 'Los paneles se abren desde el centro y se recogen al ocultar el banner.'),
    ('interfaz-ajustes', 'Ventana de Ajustes', 'Apertura y cierre de Ajustes desde la cabina.'),
]
motion_assets = {}

def motion_gallery():
    figures = []
    for name, title, description in motion_examples:
        sources = {}
        for extension, mime in [('gif', 'image/gif'), ('png', 'image/png')]:
            filename = f'animaciones/{name}.{extension}'
            data = (root / 'docs' / filename).read_bytes()
            sources[extension] = 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii')
            motion_assets[sources[extension]] = filename
        figures.append('<figure class="manual-animation"><img src="' + sources['gif'] + '" data-animation-src="' + sources['gif'] + '" data-poster-src="' + sources['png'] + '" alt="' + html.escape(description, quote=True) + '"><figcaption><strong>' + title + '</strong>. ' + description + '</figcaption><button type="button" class="motion-toggle" aria-pressed="true">Pausar GIF</button></figure>')
    return '<section id="animaciones" aria-label="Ejemplos animados"><p>Estos GIFs muestran animaciones reales del programa. Puedes detenerlos o volver a reproducirlos. El tablero de cuadros detrás del banner representa el fondo transparente de OBS.</p>' + ''.join(figures) + '</section>'

root = Path(__file__).resolve().parent.parent
guide = root / 'docs/GUIA_DE_USUARIO.md'
text = guide.read_text(encoding='utf-8-sig')
text = re.sub(r'^<a id="[a-z0-9-]+"></a>\n\n', '', text, flags=re.M)
text = text.replace('## 4. Instalar Nodejs', '## 4. Instalar Node.js')
text = text.replace('[Instalar Nodejs]', '[Instalar Node.js]')
text = text.replace('### 20.2 Nodejs no se reconoce', '### 20.2 Node.js no se reconoce')
text = text.replace('### 20.4 El celular no conecta pero la computadora si', '### 20.4 El celular no conecta pero la computadora sí')
text = text.replace('### 20.7 La duración no se guarda o aparece Campo de lista no valido', '### 20.7 La duración no se guarda o aparece Campo de lista no válido')

# Explicit ASCII IDs keep the links consistent on GitHub and in the offline guide.
toc = dict(re.findall(r'^\d+\. \[[^\]]+\]\(#(\d+)-([^\)]+)\)$', text, re.M))
lines = []
for line in text.splitlines():
    match = re.match(r'^## (\d+)\. ', line)
    if match:
        number = match.group(1)
        lines.extend([f'<a id="{number}-{toc[number]}"></a>', ''])
    for heading, anchor in [('### 20.2 ', '202-nodejs-no-se-reconoce'), ('### 20.4 ', '204-el-celular-no-conecta-pero-la-computadora-si'), ('### 20.7 ', '207-la-duracion-no-se-guarda-o-aparece-campo-de-lista-no-valido')]:
        if line.startswith(heading):
            lines.extend([f'<a id="{anchor}"></a>', ''])
    lines.append(line)
text = '\n'.join(lines) + '\n'
guide.write_text(text, encoding='utf-8')

def slug(text):
    text = text.lower()
    return re.sub(r'[^\w\- ]', '', text).replace(' ', '-')

def inline(value):
    fragments = []
    def protect_code(match):
        fragments.append('<code>' + html.escape(match.group(1)) + '</code>')
        return f'CODEFRAGMENT{len(fragments)-1}END'
    value = re.sub(r'`([^`]+)`', protect_code, value)
    value = html.escape(value)
    value = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', lambda m: '<a href="' + html.escape(html.unescape(m.group(2)), quote=True) + '">' + m.group(1) + '</a>', value)
    value = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', value)
    for index, fragment in enumerate(fragments):
        value = value.replace(f'CODEFRAGMENT{index}END', fragment)
    return value

source = text.splitlines()
explicit_ids = set(re.findall(r'<a id="([^"]+)"></a>', text))
out = []
index = 0
while index < len(source):
    line = source[index]
    if not line.strip():
        index += 1
        continue
    if re.fullmatch(r'<a id="[a-z0-9-]+"></a>', line):
        out.append(line)
        index += 1
        continue
    image = re.fullmatch(r'!\[([^\]]*)\]\(([^\)]+)\)', line)
    if image:
        alternative, filename = image.groups()
        image_path = guide.parent / filename
        image_bytes = image_path.read_bytes()
        if not image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('La captura debe ser PNG: ' + filename)
        width, height = struct.unpack('>II', image_bytes[16:24])
        caption = alternative
        following = index + 1
        while following < len(source) and not source[following].strip():
            following += 1
        if following < len(source) and source[following].startswith('**Figura '):
            caption = source[following]
            index = following + 1
        else:
            index += 1
        encoded = base64.b64encode(image_bytes).decode('ascii')
        caption_text = caption.replace('**', '')
        number = re.search(r'Figura (\d+)', caption_text)
        identifier = ' id="captura-' + number.group(1) + '"' if number else ''
        out.append('<figure class="manual-shot"' + identifier + '><a class="manual-shot-open" href="' + html.escape(filename, quote=True) + '" target="_blank" aria-label="Ampliar: ' + html.escape(alternative, quote=True) + '" data-caption="' + html.escape(caption_text, quote=True) + '"><img src="data:image/png;base64,' + encoded + '" width="' + str(width) + '" height="' + str(height) + '" loading="eager" decoding="async" alt="' + html.escape(alternative, quote=True) + '"></a><figcaption>' + inline(caption) + '</figcaption></figure>')
        continue
    if line.startswith('```'):
        code = []
        index += 1
        while index < len(source) and not source[index].startswith('```'):
            code.append(source[index])
            index += 1
        out.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
        index += 1
        continue
    heading = re.match(r'^(#{1,6}) (.+)$', line)
    if heading:
        level, title = len(heading.group(1)), heading.group(2)
        heading_id = slug(title)
        attribute = '' if heading_id in explicit_ids else f' id="{heading_id}"'
        out.append(f'<h{level}{attribute}>{inline(title)}</h{level}>')
        index += 1
        continue
    if line.startswith('| '):
        rows = []
        while index < len(source) and source[index].startswith('|'):
            cells = [part.strip() for part in source[index].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                rows.append(cells)
            index += 1
        table = '<div class="table-scroll"><table><thead><tr>' + ''.join('<th scope="col">' + inline(cell) + '</th>' for cell in rows[0]) + '</tr></thead><tbody>'
        for row in rows[1:]:
            table += '<tr>' + ''.join('<td>' + inline(cell) + '</td>' for cell in row) + '</tr>'
        out.append(table + '</tbody></table></div>')
        continue
    item = re.match(r'^(- |\d+\. )(.+)$', line)
    if item:
        ordered = item.group(1) != '- '
        tag = 'ol' if ordered else 'ul'
        items = []
        while index < len(source):
            match = re.match(r'^(\d+\. |\- )(.+)$', source[index])
            if not match or (match.group(1) != '- ') != ordered:
                break
            items.append('<li>' + inline(match.group(2)) + '</li>')
            index += 1
        start = int(re.match(r'\d+', line).group()) if ordered else 1
        out.append(f'<{tag}' + (f' start="{start}"' if ordered and start != 1 else '') + '>' + ''.join(items) + f'</{tag}>')
        continue
    paragraph = [line]
    index += 1
    while index < len(source) and source[index].strip() and not re.match(r'^(#|```|\||<a |!\[|\- |\d+\. )', source[index]):
        paragraph.append(source[index])
        index += 1
    out.append('<p>' + inline(' '.join(paragraph)) + '</p>')

body_html = '\n'.join(out)
body_html = re.sub(r'(?=<h3\b[^>]*>18\.7 )', lambda _: motion_gallery(), body_html, count=1)

page = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Manual completo de Proyector LLDM: instalación, operación, listas, OBS, respaldos y solución de problemas para personas sin conocimientos de programación.">
<title>Guía de usuario de Proyector LLDM</title>
<style>
:root { color-scheme: light; font-family: 'Segoe UI', Arial, sans-serif; color: #1c293b; background: #edf0f5; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 85px; }
body { margin: 0; font-size: 16px; line-height: 1.75; }
.toolbar { position: sticky; top: 0; z-index: 2; background: #101d34; color: #fff; padding: 13px 24px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; box-shadow: 0 2px 12px #0002; }
.toolbar strong { margin-right: auto; color: #ebcd88; }
.toolbar a,.toolbar button { padding: 7px 14px; border: 1px solid #62738b; border-radius: 7px; background: #21324a; color: #fff; font: 600 14px/1.5 'Segoe UI',Arial,sans-serif; text-decoration: none; cursor: pointer; }
main { max-width: 1020px; margin: 30px auto 60px; padding: 45px 60px; background: #fff; box-shadow: 0 8px 36px #1729440d; border: 1px solid #d9e0e9; border-radius: 12px; }
h1,h2,h3,h4 { color: #10203c; line-height: 1.3; }
h1 { font-size: 34px; letter-spacing: -.6px; border-bottom: 3px solid #bea05b; padding-bottom: 24px; }
h2 { font-size: 26px; margin: 54px 0 22px; padding-top: 24px; border-top: 1px solid #d8dee7; }
h3 { font-size: 20px; margin: 30px 0 14px; }
p { margin: 13px 0; }
li { padding-left: 4px; margin: 7px 0; }
a { color: #244d85; text-underline-offset: 3px; overflow-wrap: anywhere; }
strong { font-weight: 700; }
code { font-family: Consolas,'Courier New',monospace; font-size: .91em; background: #edf1f7; color: #183d63; padding: 2px 5px; border-radius: 4px; overflow-wrap: anywhere; }
pre { background: #10203a; color: #eef4ff; border-left: 4px solid #cfaf6b; padding: 16px 18px; overflow-x: auto; border-radius: 6px; line-height: 1.6; }
pre code { background: transparent; color: inherit; padding: 0; white-space: pre; overflow-wrap: normal; }
.table-scroll { overflow-x: auto; margin: 20px 0; }
table { border-collapse: collapse; width: 100%; font-size: 15px; }
th,td { text-align: left; vertical-align: top; border: 1px solid #d2dae6; padding: 12px 14px; min-width: 130px; }
th { background: #14233e; color: #fff; font-weight: 650; }
tr:nth-child(even) td { background: #f6f8fb; }
td code { word-break: break-word; }
.manual-shot { margin: 25px 0; padding: 14px; border: 1px solid #d5dfeb; border-radius: 9px; background: #f6f8fb; }
.manual-shot-open { display: block; width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; text-decoration: none; }
.manual-shot img { display: block; max-width: 100%; max-height: 720px; width: auto; height: auto; margin: auto; object-fit: contain; border-radius: 5px; }
.manual-shot figcaption { margin-top: 13px; color: #40516c; font-size: 14px; line-height: 1.65; }
.manual-animation { margin: 25px 0; padding: 18px; border: 1px solid #d5dfeb; border-radius: 9px; background: #f6f8fb; }
.manual-animation img { display: block; max-width: 100%; max-height: 620px; width: auto; height: auto; margin: auto; object-fit: contain; border-radius: 5px; }
.manual-animation figcaption { margin: 14px 0; color: #40516c; font-size: 14px; line-height: 1.65; }
.motion-toggle { padding: 8px 14px; border: 1px solid #647996; border-radius: 7px; background: #172b48; color: #fff; font: 600 14px/1.4 'Segoe UI',Arial,sans-serif; cursor: pointer; }
#animaciones { scroll-margin-top: 100px; }
#capture-viewer { width: fit-content; max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); margin: auto; padding: 0; border: 1px solid #b7c6d8; border-radius: 10px; color: #1c293b; background: #fff; }
#capture-viewer::backdrop { background: #071323d9; }
.capture-toolbar { position: sticky; top: 0; padding: 12px 16px; background: #fff; display: flex; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #d5dfeb; }
.capture-toolbar p { flex: 1 1 300px; max-width: 85ch; margin: 0; font-size: 14px; line-height: 1.5; }
.capture-toolbar button { padding: 8px 14px; font: 600 14px/1.4 'Segoe UI',Arial,sans-serif; border: 1px solid #647996; border-radius: 7px; background: #172b48; color: white; cursor: pointer; }
.capture-scroll { max-height: calc(100dvh - 180px); overflow: auto; padding: 16px; }
.capture-scroll img { display: block; width: auto; height: auto; max-width: 100%; margin: auto; }
.capture-scroll.native-size img { max-width: none; }
a:focus-visible,button:focus-visible { outline: 3px solid #799ed2; outline-offset: 4px; }
@media(max-width:650px) { .toolbar { padding: 10px 14px; gap: 9px; } .toolbar strong { flex-basis: 100%; } main { margin: 16px 10px 30px; padding: 25px 20px; } body { font-size: 15px; } h1 { font-size: 27px; } h2 { font-size: 23px; } th,td { padding: 10px; } html { scroll-padding-top: 130px; } }
@media(prefers-reduced-motion:reduce) { html { scroll-behavior: auto; } }
@media print { @page { size: A4; margin: 18mm; } :root { background: #fff; } .toolbar { display: none; } main { max-width: none; margin: 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; } body { font-size: 10.5pt; line-height: 1.55; } h1 { font-size: 24pt; } h2 { font-size: 17pt; break-before: page; border-top: 0; padding-top: 0; } h3 { font-size: 13pt; break-after: avoid; } p { orphans: 3; widows: 3; } th { background: #e9edf3; color: #10203a; } table { font-size: 9pt; } thead { display: table-header-group; } tr,pre { break-inside: avoid; } .table-scroll { overflow: visible; } pre { white-space: pre-wrap; background: #f4f6f9; color: #10203a; } pre code { white-space: pre-wrap; } a { color: #183b67; } }
@media print { #capture-viewer { display: none !important; } .manual-shot { break-inside: avoid; background: #fff; border-radius: 0; padding: 8px; } .manual-shot img { max-height: 140mm; } .manual-shot figcaption { font-size: 9pt; } }
</style>
</head>
<body>
<nav class="toolbar" aria-label="Controles del manual"><strong>Proyector LLDM · Manual de usuario</strong><a href="#captura-1">Ver capturas</a><a href="#animaciones">Ver animaciones</a><a href="#índice">Índice</a><a id="download-manual-pdf" href="GUIA_DE_USUARIO.pdf" download="Proyector_LLDM_Manual_de_usuario.pdf">Descargar PDF</a></nav>
<main>
'''+ body_html + '''
</main>
<dialog id="capture-viewer" aria-labelledby="capture-caption">
<div class="capture-toolbar"><p id="capture-caption"></p><button id="capture-size" type="button">Tamaño real</button><button id="capture-close" type="button">Cerrar</button></div>
<div class="capture-scroll"><img id="capture-image" alt=""></div>
</dialog>
<script>
const viewer = document.getElementById('capture-viewer');
const picture = document.getElementById('capture-image');
const scrollArea = viewer.querySelector('.capture-scroll');
const sizeButton = document.getElementById('capture-size');
document.querySelectorAll('.manual-shot-open').forEach(button => button.addEventListener('click', event => {
  if (typeof viewer.showModal !== 'function') return;
  event.preventDefault();
  const original = button.querySelector('img');
  picture.src = original.src; picture.alt = original.alt;
  document.getElementById('capture-caption').textContent = button.dataset.caption;
  scrollArea.classList.remove('native-size'); sizeButton.textContent = 'Tamaño real';
  viewer.showModal();
}));
sizeButton.addEventListener('click', () => { const native = scrollArea.classList.toggle('native-size'); sizeButton.textContent = native ? 'Ajustar a la ventana' : 'Tamaño real'; });
document.getElementById('capture-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => picture.removeAttribute('src'));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.manual-animation').forEach(figure => {
  const image = figure.querySelector('img');
  const button = figure.querySelector('.motion-toggle');
  function setPlaying(playing) {
    image.src = playing ? image.dataset.animationSrc : image.dataset.posterSrc;
    button.setAttribute('aria-pressed', String(playing));
    button.textContent = playing ? 'Pausar GIF' : 'Reproducir GIF';
  }
  if (reducedMotion.matches) setPlaying(false);
  button.addEventListener('click', () => setPlaying(button.getAttribute('aria-pressed') !== 'true'));
  reducedMotion.addEventListener('change', event => { if (event.matches) setPlaying(false); });
});
</script>
</body>
</html>
'''
assets = {}
for filename in re.findall(r'!\[[^\]]*\]\((capturas/[^)]+)\)', text):
    encoded = base64.b64encode((guide.parent / filename).read_bytes()).decode('ascii')
    assets['data:image/png;base64,' + encoded] = html.escape(filename, quote=True)
linked_page = page
for embedded, filename in assets.items():
    linked_page = linked_page.replace('src="' + embedded + '"', 'src="' + filename + '"')
for embedded, filename in motion_assets.items():
    linked_page = linked_page.replace(embedded, html.escape(filename, quote=True))
for filename, content in [('GUIA_DE_USUARIO.html', linked_page), ('GUIA_DE_USUARIO_PORTATIL.html', page)]:
    destination = root / 'docs' / filename
    temporary = destination.with_suffix('.html.tmp')
    temporary.write_text(content, encoding='utf-8')
    temporary.replace(destination)
print('Generados el HTML con capturas enlazadas y el HTML portátil con capturas integradas.')
