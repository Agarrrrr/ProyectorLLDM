const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createPresentationService } = require('../src/presentations/service');

// A tiny valid vector PDF with four different page proportions.
function document() {
  const sizes = [[1920, 1080], [800, 600], [500, 900], [600, 600]];
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const pages = [];
  for (const [width, height] of sizes) {
    const id = objects.length + 1; pages.push(`${id} 0 R`);
    const drawing = `0.1 0.2 0.4 rg 0 0 ${width} ${height} re f`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << >> /Contents ${id + 1} 0 R >>`);
    objects.push(`<< /Length ${drawing.length} >>\nstream\n${drawing}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pages.join(' ')}] /Count ${pages.length} >>`;
  let output = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  return output + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

test('PDF se convierte hasta 4K conservando páginas 16:9, 4:3, verticales y cuadradas', async t => {
  try { execFileSync(process.env.PYTHON_PATH || 'python', ['-c', 'import fitz'], { timeout: 10000, windowsHide: true, stdio: 'ignore' }); }
  catch { t.skip('Requiere Python con PyMuPDF; configura PYTHON_PATH para probar la conversión real.'); return; }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'presentation-resolution-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'original.pdf'); fs.writeFileSync(source, document());
  const uploads = path.join(directory, 'uploads');
  const service = createPresentationService({ dataDir: directory, uploadsDir: uploads });
  const result = await service.createPresentationFromUploads([{ path: source, originalname: 'original.pdf', mimetype: 'application/pdf' }], 'Prueba de proporciones');
  assert.equal(result.slides.length, 4);
  const images = fs.readdirSync(path.join(uploads, result.id)).filter(name => /^slide_\d+\.png$/.test(name)).sort();
  assert.equal(images.length, 4);
  const expected = [[3840, 2160], [3840, 2880], [2134, 3840], [3840, 3840]];
  for (let index = 0; index < images.length; index++) {
    const png = fs.readFileSync(path.join(uploads, result.id, images[index]));
    const actual = [png.readUInt32BE(16), png.readUInt32BE(20)];
    assert.deepEqual(actual, expected[index]);
  }
});
