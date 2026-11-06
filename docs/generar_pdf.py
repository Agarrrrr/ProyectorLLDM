"""Generate the illustrated manual. Authoring tools: pip install reportlab pillow."""
from pathlib import Path
import re
import html
import json
import os
import shutil
from io import BytesIO

from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    NextPageTemplate, Table, TableStyle, ListFlowable, ListItem,
    Preformatted, Image, KeepTogether, CondPageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs/GUIA_DE_USUARIO.md'
OUTPUT = ROOT / 'output/pdf/Proyector_LLDM_Manual_de_usuario.pdf'
PUBLISHED = ROOT / 'docs/GUIA_DE_USUARIO.pdf'
WORK = ROOT / 'tmp/pdfs'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
rl_config.warnOnMissingFontGlyphs = 1

FONT_DIR = Path(os.environ.get('PROYECTOR_MANUAL_FONT_DIR') or (Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts'))
for name, filename in [('Body', 'segoeui.ttf'), ('Bold', 'segoeuib.ttf'), ('Semi', 'seguisb.ttf'), ('Italic', 'segoeuii.ttf'), ('Mono', 'consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / filename)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Italic', boldItalic='Bold')

NAVY = colors.HexColor('#14243f')
GOLD = colors.HexColor('#b29450')
INK = colors.HexColor('#28364b')
MUTED = colors.HexColor('#61718a')
LINE = colors.HexColor('#d8e0eb')
PAPER = colors.HexColor('#f2f5f9')
WIDTH, HEIGHT = A4
LEFT, RIGHT, TOP, BOTTOM = 49, 49, 58, 52
CONTENT_WIDTH = WIDTH - LEFT - RIGHT

styles = {
    'body': ParagraphStyle('BodyText', fontName='Body', fontSize=10.2, leading=15, textColor=INK, spaceAfter=8, splitLongWords=True),
    'chapter': ParagraphStyle('Chapter', fontName='Bold', fontSize=22, leading=28, textColor=NAVY, spaceBefore=26, spaceAfter=19, keepWithNext=True),
    'section': ParagraphStyle('Section', fontName='Semi', fontSize=12.7, leading=17, textColor=NAVY, spaceBefore=16, spaceAfter=8, keepWithNext=True),
    'front': ParagraphStyle('Front', fontName='Bold', fontSize=24, leading=30, textColor=NAVY, spaceAfter=18, keepWithNext=True),
    'list': ParagraphStyle('ListText', fontName='Body', fontSize=10.2, leading=15, textColor=INK, spaceAfter=5, splitLongWords=True),
    'cell': ParagraphStyle('Cell', fontName='Body', fontSize=9.2, leading=13, textColor=INK, splitLongWords=True),
    'th': ParagraphStyle('TableHeader', fontName='Semi', fontSize=9.4, leading=13, textColor=colors.white, splitLongWords=True),
    'caption': ParagraphStyle('Caption', fontName='Body', fontSize=9.1, leading=12.8, textColor=MUTED, spaceBefore=8, spaceAfter=7),
    'code': ParagraphStyle('Command', fontName='Mono', fontSize=8.7, leading=12.7, textColor=NAVY, backColor=PAPER, borderColor=LINE, borderWidth=.6, borderPadding=10, spaceBefore=8, spaceAfter=12),
    'toc': ParagraphStyle('ContentsEntry', fontName='Body', fontSize=9.8, leading=13, textColor=INK, leftIndent=0, firstLineIndent=0, rightIndent=25, spaceBefore=4),
    'small': ParagraphStyle('Small', fontName='Body', fontSize=9.3, leading=13.5, textColor=MUTED, spaceAfter=8),
}

text = SOURCE.read_text(encoding='utf-8-sig').replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')
source = text.splitlines()
CAPTURE_COUNT = len(re.findall(r'^!\[', text, re.M))
anchor_map = {}
pending = []
for line in source:
    anchor = re.fullmatch(r'<a id="([^"]+)"></a>', line)
    if anchor:
        pending.append(anchor.group(1))
    heading = re.match(r'^#{2,3} (\d+(?:\.\d+)*)(?:\.)? (.+)$', line)
    if heading:
        key = 'section-' + heading.group(1).replace('.', '-')
        for value in pending:
            anchor_map[value] = key
        pending = []

def inline(value):
    fragments = []
    def protect(match):
        fragments.append('<font name="Mono" size="8.8" color="#183d63">' + html.escape(match.group(1)) + '</font>')
        return f'CODETOKEN{len(fragments)-1}END'
    value = re.sub(r'`([^`]+)`', protect, value)
    value = html.escape(value)
    def link(match):
        label, target = match.groups()
        if target.startswith('#'):
            destination = anchor_map.get(html.unescape(target[1:]))
            return f'<link href="#{destination}" color="#244d85">{label}</link>' if destination else label
        if not target.startswith(('http:', 'https:')):
            target = 'https://github.com/HuriTolentino/ProyectorLLDM' if 'README' in target else target
        return '<link href="' + target + '" color="#244d85">' + label + '</link>'
    value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, value)
    value = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', value)
    for index, fragment in enumerate(fragments):
        value = value.replace(f'CODETOKEN{index}END', fragment)
    return value

def paragraph(value, kind='body'):
    return Paragraph(inline(value), styles[kind])

def figure(filename, caption):
    image = Image(str(SOURCE.parent / filename))
    max_height = 220 if filename.endswith("70-instalador-windows.png") else 400
    scale = min(CONTENT_WIDTH / image.imageWidth, max_height / image.imageHeight, 1.0)
    image.drawWidth = image.imageWidth * scale
    image.drawHeight = image.imageHeight * scale
    image.hAlign = 'CENTER'
    block = KeepTogether([Spacer(1, 10), image, paragraph(caption, 'caption'), Spacer(1, 9)])
    block.manual_image = image
    return block

def table(rows):
    cells = [[paragraph(cell, 'th' if i == 0 else 'cell') for cell in row] for i, row in enumerate(rows)]
    padding = 4 if rows[0][0] == 'Palabra' else 6
    widths = [155, CONTENT_WIDTH - 155] if len(rows[0]) == 2 else [CONTENT_WIDTH / len(rows[0])] * len(rows[0])
    value = Table(cells, colWidths=widths, repeatRows=1, hAlign='LEFT', spaceBefore=9, spaceAfter=14)
    value.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, PAPER]),
        ('GRID', (0,0), (-1,-1), .45, LINE),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 9), ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,0), (-1,-1), padding), ('BOTTOMPADDING', (0,0), (-1,-1), padding),
    ]))
    return value

def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    # Browser-rendered from the institutional SVG at 480 dpi at this print size.
    # Keep its complete contours; PDF path conversion can damage the lettering.
    canvas.drawImage(str(ROOT / 'docs/assets/logo-manual.png'), (WIDTH-270)/2, 410,
                     width=270, height=270*257.38/323.62, mask='auto')
    canvas.setFillColor(colors.white)
    canvas.setFont('Bold', 34)
    canvas.drawCentredString(WIDTH/2, 285, 'Proyector LLDM')
    canvas.setFont('Body', 19)
    canvas.drawCentredString(WIDTH/2, 247, 'Guía de instalación y uso')
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(1)
    canvas.line(WIDTH/2-30, 216, WIDTH/2+30, 216)
    canvas.restoreState()

def furniture(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.setLineWidth(.5)
    canvas.line(LEFT, HEIGHT-36, WIDTH-RIGHT, HEIGHT-36)
    canvas.line(LEFT, 36, WIDTH-RIGHT, 36)
    canvas.setFont('Semi', 8.2); canvas.setFillColor(MUTED)
    canvas.drawString(LEFT, HEIGHT-27, 'PROYECTOR LLDM')
    canvas.setFont('Body', 8.2); canvas.drawRightString(WIDTH-RIGHT, HEIGHT-27, 'Guía de instalación y operación')
    canvas.drawString(LEFT, 22, 'Manual de usuario · Huri Tolentino')
    canvas.setFillColor(NAVY); canvas.drawRightString(WIDTH-RIGHT, 22, str(doc.page))
    canvas.restoreState()

class ManualDoc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and hasattr(flowable, '_bookmark'):
            key = flowable._bookmark
            title = flowable.getPlainText()
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, flowable._outline, closed=False)
            if flowable._outline == 0:
                self.notify('TOCEntry', (0, title, self.page, key))

doc = ManualDoc(str(OUTPUT), pagesize=A4, title='Proyector LLDM - Manual ilustrado de usuario', author='Huri Tolentino', subject='Instalación, operación local, listas, TV, OBS y solución de problemas', pageCompression=1)
frame = Frame(LEFT, BOTTOM, CONTENT_WIDTH, HEIGHT-TOP-BOTTOM, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate('Cover', [frame], onPage=cover), PageTemplate('Body', [frame], onPage=furniture)])
story = [Spacer(1,1), NextPageTemplate('Body'), PageBreak()]
story += [paragraph('Cómo utilizar este manual', 'front'),
    paragraph('Esta guía reúne la instalación, la operación y la solución de problemas de Proyector LLDM. Puedes seguirla en orden o utilizar el índice y los marcadores del lector PDF para ir directamente a una tarea.'),
    paragraph('Las capturas muestran la interfaz real con una copia de los datos de la instalación. Las fechas, nombres y selecciones pueden variar: revisa siempre tu propia preparación antes de enviarla a las pantallas.'),
    paragraph('La computadora de cabina puede estar conectada por cable Ethernet. Los celulares utilizan el Wi-Fi del router de la misma red local. El uso descrito en este manual se limita a la red del templo.'),
    figure('capturas/01-cabina-inicial.png', '**Figura 1.** Vista general de la cabina. Las pestañas preparan el contenido y el minivisor de la derecha muestra la salida de TV.'),
    paragraph('Para ampliar las imágenes, utiliza el zoom de tu lector PDF. Los números impresos coinciden con las páginas del archivo.', 'small'), PageBreak(),
    paragraph('Índice de capítulos', 'front')]
toc = TableOfContents(); toc.levelStyles = [styles['toc']]; toc.dotsMinLevel = 0
toc.tableStyle = TableStyle([('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 1), ('BOTTOMPADDING', (0,0), (-1,-1), 1)])
story += [toc, PageBreak()]

start = next(i for i, value in enumerate(source) if value.startswith('## 1. '))
index = start
figures = 1
chapters = 0
section = []
section_title = None
section_figures = 0
measurement_canvas = Canvas(BytesIO(), pagesize=A4)

def flush_section():
    # Keep the explanation and its screenshot in one block when they fit on a
    # page. Oversized sections may split; each additional screenshot starts a
    # labelled continuation instead of appearing under an unrelated heading.
    if section:
        image_index = next((i for i, item in enumerate(section) if hasattr(item, 'manual_image')), None)
        if image_index is None:
            story.append(KeepTogether(section[:]))
        else:
            frame_height = HEIGHT - TOP - BOTTOM
            before = KeepTogether(section[:image_index])
            before.wrapOn(measurement_canvas, CONTENT_WIDTH, frame_height)
            figure_block = section[image_index]
            figure_block.wrapOn(measurement_canvas, CONTENT_WIDTH, frame_height)
            image = figure_block.manual_image
            available = frame_height - before._H - (figure_block._H - image.drawHeight) - 24
            if available < 150:
                # A long setup procedure can fill a whole page before its
                # screenshot. Give that image an explicit subsection heading.
                story.extend(section[:image_index])
                story.append(KeepTogether([paragraph(section_title + ' (continuación)', 'section'), figure_block]))
            else:
                if available < image.drawHeight:
                    image.drawWidth *= available / image.drawHeight
                    image.drawHeight = available
                story.append(KeepTogether(section[:image_index + 1]))
            story.extend(section[image_index + 1:])
        section.clear()

while index < len(source):
    line = source[index]
    if not line.strip() or line.startswith('<a id='):
        index += 1; continue
    heading = re.match(r'^(#{2,3}) (\d+(?:\.\d+)*)(?:\.)? (.+)$', line)
    if heading:
        level, number = len(heading.group(1)), heading.group(2)
        chapter_intro = level == 3 and len(section) == 1 and getattr(section[0], '_outline', None) == 0
        if not chapter_intro:
            flush_section()
        if level == 2:
            if chapters: story.append(CondPageBreak(190))
            chapters += 1
        item = paragraph(line[level+1:], 'chapter' if level == 2 else 'section')
        item._bookmark = 'section-' + number.replace('.', '-')
        item._outline = 0 if level == 2 else 1
        section_title = line[level+1:]
        section_figures = 0
        section.append(item); index += 1; continue
    image = re.fullmatch(r'!\[([^\]]*)\]\(([^)]+)\)', line)
    if image:
        caption = image.group(1); following = index + 1
        while following < len(source) and not source[following].strip(): following += 1
        if following < len(source) and source[following].startswith('**Figura '):
            caption = source[following]; index = following + 1
        else: index += 1
        if section_figures:
            flush_section()
            section.append(paragraph(section_title + ' (continuación)', 'section'))
        section.append(figure(image.group(2), caption))
        section_figures += 1
        figures += 1; continue
    if line.startswith('```'):
        block = []; index += 1
        while index < len(source) and not source[index].startswith('```'):
            block.append(source[index]); index += 1
        section.append(Preformatted('\n'.join(block), styles['code'])); index += 1; continue
    if line.startswith('|'):
        rows = []
        while index < len(source) and source[index].startswith('|'):
            cells = [value.strip() for value in source[index].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?', value) for value in cells): rows.append(cells)
            index += 1
        section += [CondPageBreak(140), table(rows)]; continue
    match = re.match(r'^(\d+\. |\- )(.+)$', line)
    if match:
        ordered = match.group(1) != '- '
        first = int(re.match(r'\d+', line).group()) if ordered else 1
        items = []
        while index < len(source):
            item = re.match(r'^(\d+\. |\- )(.+)$', source[index])
            if not item or (item.group(1) != '- ') != ordered: break
            items.append(ListItem(paragraph(item.group(2), 'list'), leftIndent=0)); index += 1
        section.append(ListFlowable(items, bulletType='1' if ordered else 'bullet', start=first if ordered else None, leftIndent=18, bulletFontName='Body', bulletFontSize=9, spaceAfter=7))
        continue
    block = [line]; index += 1
    while index < len(source) and source[index].strip() and not re.match(r'^(#|```|\||<a |!\[|\- |\d+\. )', source[index]):
        block.append(source[index]); index += 1
    section.append(paragraph(' '.join(block)))

flush_section()
doc.multiBuild(story)
shutil.copyfile(OUTPUT, PUBLISHED)
print(json.dumps({'pdf': str(OUTPUT), 'copy': str(PUBLISHED), 'chapters': chapters, 'figures': figures}, ensure_ascii=False))
