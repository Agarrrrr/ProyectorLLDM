import type { WeekData } from '../types';
import { canvasBlob, prepareImageDocuments, renderImage, saveBlob } from '../images/render';
import type { ImageDocument } from '../images/layout';
export async function downloadImage(image: ImageDocument, date: string) {
  saveBlob(await canvasBlob(await renderImage(image, true)), `${image.id}_${date}.png`);
}
export async function downloadListsZip(data: WeekData) {
  const { default: JSZip } = await import('jszip');
  const images = await prepareImageDocuments(data), zip = new JSZip();
  for (const image of images) zip.file(`${image.id}_${data.startDate}.png`, await canvasBlob(await renderImage(image, true)));
  saveBlob(await zip.generateAsync({ type: 'blob' }), `listas_${data.startDate}.zip`);
}
