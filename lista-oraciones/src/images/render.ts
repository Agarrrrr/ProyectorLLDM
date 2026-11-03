import { buildImageDocuments, type ImageDocument } from './layout';
import type { WeekData } from '../types';
let assets: Promise<{ church: HTMLImageElement; centenary: HTMLImageElement }> | undefined;
function loadLogo(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('No se pudo cargar un logo oficial.'));
    image.src = source;
  });
}
export function loadImageAssets() {
  return assets ||= Promise.all([
    document.fonts.load('700 19px Montserrat'), document.fonts.load('800 30px Montserrat'), document.fonts.load('700 26px Outfit'),
    loadLogo('/logo_lldm_oficial.svg'), loadLogo('/logo_centenario_oficial.svg')
  ]).then(([, , , church, centenary]) => ({ church, centenary }));
}
export async function prepareImageDocuments(week: WeekData) {
  await loadImageAssets();
  const response = await fetch('/api/settings');
  if (!response.ok) throw new Error('No se pudieron cargar los datos de la colonia.');
  const { settings } = await response.json();
  return buildImageDocuments(week, settings.church.address);
}
export async function renderImage(image: ImageDocument, highResolution = false): Promise<HTMLCanvasElement> {
  const logo = await loadImageAssets(), scale = highResolution ? 3840 / Math.max(image.width, image.height) : 1;
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d')!; ctx.scale(scale, scale);
  for (const item of image.commands) {
    if (item.kind === 'rect') {
      if (item.fill === '$gold') { const gradient = ctx.createLinearGradient(item.x, item.y, item.x + item.width, item.y); gradient.addColorStop(0, '#9b8241'); gradient.addColorStop(1, '#b99532'); ctx.fillStyle = gradient; } else ctx.fillStyle = item.fill;
      if (item.radius) { ctx.beginPath(); ctx.roundRect(item.x, item.y, item.width, item.height, item.radius); ctx.fill(); }
      else ctx.fillRect(item.x, item.y, item.width, item.height);
      if (item.stroke) { ctx.strokeStyle = item.stroke; ctx.lineWidth = 1; ctx.strokeRect(item.x + .5, item.y + .5, item.width - 1, item.height - 1); }
    } else if (item.kind === 'logo') ctx.drawImage(item.asset === 'centenary' ? logo.centenary : logo.church, item.x, item.y, item.width, item.height);
    else {
      ctx.letterSpacing = `${item.tracking || 0}px`;
      ctx.font = `${item.weight} ${item.size}px ${item.family || "Montserrat"}`; ctx.fillStyle = item.color; ctx.textAlign = item.align; ctx.textBaseline = 'middle';
      const x = item.align === 'center' ? item.x + item.width / 2 : item.x;
      item.lines.forEach((line, i) => {
        const y = item.y + (i + .5) * item.lineHeight;
        if (ctx.measureText(line).width > item.width + 1 || item.x < 0 || item.x + item.width > image.width || y - item.lineHeight / 2 < 0 || y + item.lineHeight / 2 > image.height) throw new Error('Una imagen contiene texto fuera de sus límites. Revisa ese campo antes de descargar.');
        ctx.fillText(line, x, y);
      });
    }
  }
  return canvas;
}
export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen PNG.')), 'image/png')); }
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
