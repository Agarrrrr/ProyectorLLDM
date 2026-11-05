const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('node:url');
const { execFile } = require('child_process');
const { promisify } = require('util');
const runFile = promisify(execFile);

function createPresentationService({ dataDir, uploadsDir, maxEdge = Number(process.env.PRESENTATION_MAX_EDGE) || 3840 }) {
  if (!Number.isSafeInteger(maxEdge) || maxEdge < 1280 || maxEdge > 7680) throw new Error('PRESENTATION_MAX_EDGE debe estar entre 1280 y 7680 píxeles.');
  const DATA_DIR = dataDir;
  const PRESENTATIONS_FILE = path.join(DATA_DIR, 'presentations.json');
  const UPLOADS_DIR = uploadsDir;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  function getPresentations() {
    try {
      if (fs.existsSync(PRESENTATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(PRESENTATIONS_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[PRESENTATIONS] Error leyendo presentations.json:', e);
    }
    return [];
  }

  function savePresentations(list) {
    try {
      fs.writeFileSync(PRESENTATIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('[PRESENTATIONS] Error guardando presentations.json:', e);
      throw e;
    }
  }

  async function runFirstAvailable(candidates, args, options) {
    let lastError;
    for (const cmd of candidates) {
      try {
        return await runFile(cmd, args, options);
      } catch (error) {
        lastError = error;
        if (error.code !== 'ENOENT') throw error;
      }
    }
    throw lastError;
  }

  async function convertPptxWithPowerpoint(filePath, outDir) {
    const psScriptPath = path.join(outDir, 'convert_temp.ps1');
    const psContent = `
  param([string]$FilePath, [string]$OutDir)
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
  [System.Threading.Thread]::CurrentThread.CurrentCulture = 'es-ES'
  $ErrorActionPreference = "Stop"
  if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
  $alreadyRunning = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
  $app = New-Object -ComObject PowerPoint.Application
  $pres = $null
  $previousSecurity = $app.AutomationSecurity
  try {
    $app.AutomationSecurity = 3
    $pres = $app.Presentations.Open($FilePath, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    $app.AutomationSecurity = $previousSecurity
    $count = $pres.Slides.Count
    $slideWidth = [double]$pres.PageSetup.SlideWidth
    $slideHeight = [double]$pres.PageSetup.SlideHeight
    $factor = ${maxEdge} / [Math]::Max($slideWidth, $slideHeight)
    $exportWidth = [int][Math]::Max(1, [Math]::Round($slideWidth * $factor))
    $exportHeight = [int][Math]::Max(1, [Math]::Round($slideHeight * $factor))
    for ($i = 1; $i -le $count; $i++) {
      $s = $pres.Slides.Item($i)
      $padIdx = $i.ToString().PadLeft(3, '0')
      $s.Export("$OutDir\\slide_$padIdx.png", "PNG", $exportWidth, $exportHeight)
    }
    Write-Output "COUNT:$count"
  } finally {
    if ($null -ne $pres) {
      $pres.Close()
      [System.Runtime.Interopservices.Marshal]::ReleaseComObject($pres) | Out-Null
    }
    $app.AutomationSecurity = $previousSecurity
    if (!$alreadyRunning -and $app.Presentations.Count -eq 0) { $app.Quit() }
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($app) | Out-Null
  }
  `;
    // \uFEFF (UTF-8 BOM) para que PowerShell reconozca la codificación UTF-8 sin ambigüedad en Windows
    fs.writeFileSync(psScriptPath, '\uFEFF' + psContent, 'utf8');

    try {
      const { stdout: res } = await runFile('powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath,
        '-FilePath', filePath, '-OutDir', outDir
      ], { encoding: 'utf8', timeout: 120000, windowsHide: true });
      console.log('[PPTX CONVERT OUTPUT]', res.trim());
    } finally {
      if (fs.existsSync(psScriptPath)) {
        try { fs.unlinkSync(psScriptPath); } catch (_) {}
      }
    }
  }

  async function convertWithLibreOffice(filePath, outDir, extension) {
    const input = path.join(outDir, 'entrada' + extension);
    const pdf = path.join(outDir, 'entrada.pdf');
    const profileDir = path.join(outDir, 'perfil');
    const officeCandidates = process.env.LIBREOFFICE_PATH
      ? [process.env.LIBREOFFICE_PATH]
      : (process.platform === 'darwin'
        ? ['/Applications/LibreOffice.app/Contents/MacOS/soffice', 'libreoffice', 'soffice']
        : ['libreoffice', 'soffice']);
    await fs.promises.copyFile(filePath, input);
    try {
      await runFirstAvailable(officeCandidates, [
        '-env:UserInstallation=' + pathToFileURL(profileDir).href,
        '--headless', '--convert-to', 'pdf', '--outdir', outDir, input
      ], { timeout: 120000, windowsHide: true });
      await convertPdfWithPython(pdf, outDir);
    } finally {
      await fs.promises.rm(input, { force: true });
      await fs.promises.rm(pdf, { force: true });
      await fs.promises.rm(profileDir, { recursive: true, force: true });
    }
  }

  async function convertPdfWithPython(filePath, outDir) {
    const pyScriptPath = path.join(outDir, 'convert_temp.py');
    const pyContent = `
  import fitz, os, sys
  pdf_path = sys.argv[1]
  out_dir = sys.argv[2]
  os.makedirs(out_dir, exist_ok=True)
  doc = fitz.open(pdf_path)
  for i, page in enumerate(doc):
      rect = page.rect
      zoom = ${maxEdge}.0 / max(rect.width, rect.height)
      mat = fitz.Matrix(zoom, zoom)
      pix = page.get_pixmap(matrix=mat, alpha=False)
      pad = str(i + 1).zfill(3)
      pix.save(os.path.join(out_dir, f"slide_{pad}.png"))
  print(f"COUNT:{len(doc)}")
  `;
    fs.writeFileSync(pyScriptPath, pyContent.replace(/^ {2}/gm, '').trimStart(), 'utf8');
    const pythonCandidates = process.env.PYTHON_PATH
      ? [process.env.PYTHON_PATH]
      : (process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']);

    try {
      const { stdout: res } = await runFirstAvailable(pythonCandidates,
        [pyScriptPath, filePath, outDir], { encoding: 'utf8', timeout: 120000, windowsHide: true });
      console.log('[PDF CONVERT OUTPUT]', res.trim());
    } finally {
      if (fs.existsSync(pyScriptPath)) {
        try { fs.unlinkSync(pyScriptPath); } catch (_) {}
      }
    }
  }

  function cleanTitle(rawName) {
    if (!rawName) return 'Presentación sin título';
    let name = rawName;
    try {
      const fixed = Buffer.from(rawName, 'latin1').toString('utf8');
      if (!/[\uFFFD]/.test(fixed) && fixed !== rawName) {
        name = fixed;
      }
    } catch (_) {}
    const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function createPresentationFromUploads(files, customTitle) {
    if (!files || files.length === 0) {
      throw new Error('No se recibieron archivos para procesar.');
    }

    const presId = 'pres_' + require('crypto').randomUUID();
    const presDir = path.join(UPLOADS_DIR, presId);
    fs.mkdirSync(presDir, { recursive: true });

    const firstFile = files[0];
    const ext = path.extname(firstFile.originalname || firstFile.filename).toLowerCase();
    const presentationTitle = customTitle && customTitle.trim()
      ? customTitle.trim()
      : cleanTitle(firstFile.originalname || firstFile.filename);

    console.log(`[PRESENTATION] Procesando "${presentationTitle}" (${ext}) en ${presDir}...`);

    try {
      if (ext === '.pptx' || ext === '.ppt') {
        if (process.platform === 'win32') await convertPptxWithPowerpoint(firstFile.path, presDir);
        else await convertWithLibreOffice(firstFile.path, presDir, ext);
      } else if (ext === '.pdf') {
        await convertPdfWithPython(firstFile.path, presDir);
      } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        // Es una o varias imágenes
        files.forEach((file, idx) => {
          const padIdx = String(idx + 1).padStart(3, '0');
          const targetPath = path.join(presDir, `slide_${padIdx}.png`);
          fs.copyFileSync(file.path, targetPath);
        });
      } else {
        throw new Error(`Formato no compatible: ${ext}. Usa .pptx, .ppt, .pdf o imágenes.`);
      }

      // Leer diapositivas generadas
      const slideFiles = fs.readdirSync(presDir)
        .filter(f => /^slide_\d+\.png$/i.test(f))
        .sort((a, b) => a.localeCompare(b));

      if (slideFiles.length === 0) {
        throw new Error('No se pudieron extraer diapositivas del archivo.');
      }

      const slides = slideFiles.map((file, idx) => {
        const url = `/uploads/presentations/${presId}/${file}`;
        return {
          slideNum: idx + 1,
          title: `Diapositiva ${idx + 1}`,
          imageUrl: url,
          thumbUrl: url
        };
      });

      const newPres = {
        id: presId,
        title: presentationTitle,
        filename: firstFile.originalname || firstFile.filename,
        totalSlides: slides.length,
        coverUrl: slides[0].imageUrl,
        createdAt: new Date().toISOString(),
        slides: slides
      };

      const list = getPresentations();
      list.unshift(newPres);
      savePresentations(list);

      console.log(`[PRESENTATION] "${presentationTitle}" lista con ${slides.length} diapositivas.`);
      return newPres;
    } catch (error) {
      fs.rmSync(presDir, { recursive: true, force: true });
      throw error;
    } finally {
      for (const file of files) {
        try { fs.unlinkSync(file.path); } catch (error) {
          if (error.code !== 'ENOENT') console.warn('[UPLOAD CLEANUP]', error.message);
        }
      }
    }
  }

  function deletePresentation(id) {
    const list = getPresentations();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return false;

    const presDir = path.resolve(UPLOADS_DIR, id);
    const relative = path.relative(path.resolve(UPLOADS_DIR), presDir);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Identificador de presentación inválido.');

    list.splice(idx, 1);
    savePresentations(list);

    if (fs.existsSync(presDir)) {
      try {
        fs.rmSync(presDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`[PRESENTATION] Error eliminando carpeta ${presDir}:`, e);
      }
    }
    return true;
  }

  return {
    getPresentations,
    savePresentations,
    createPresentationFromUploads,
    deletePresentation
  };

}

module.exports = { createPresentationService };
