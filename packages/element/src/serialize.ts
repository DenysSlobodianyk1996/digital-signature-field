import { encodeBase64 } from './base64';
import type { BaseImage } from './image';
import type { Size, Stroke } from './ink';
import { escapeAttr, round, strokePaths, toSvgMarkup, type RenderOptions } from './render';
import { signatureDataMarkup, toSignatureData, type BaseLayer, type SignatureData } from './value';

/** How the field's `value` (and the `change` detail) is serialized (ADR-0005). */
export type ValueFormat = 'svg' | 'png' | 'json';

export const VALUE_FORMATS: readonly ValueFormat[] = ['svg', 'png', 'json'];

/** Everything an export paints: the base layer, the strokes on top, and the size their coordinates are in. */
export interface Ink {
  size: Size;
  base: BaseLayer | null;
  strokes: readonly Stroke[];
}

/**
 * Export settings. Exports are built from these and the ink only, never from computed page CSS,
 * so a themed page produces the same image.
 */
export interface ExportOptions {
  render: RenderOptions;
  /** Painted under the ink; `'transparent'` paints nothing. */
  background: string;
}

const allStrokes = ({ base, strokes }: Ink): readonly Stroke[] => (base ? [...base.strokes, ...strokes] : strokes);

const isTransparent = (background: string): boolean => background.trim().toLowerCase() === 'transparent';

/** Lossless signature data for the ink. */
export function toData(ink: Ink): SignatureData {
  return toSignatureData(allStrokes(ink), ink.size, ink.base?.image);
}

/** SVG `<image>` for a base-layer image, fitted (and centred) into the ink's size. Empty without one. */
export function baseImageMarkup(ink: Pick<Ink, 'size' | 'base'>): string {
  const image = ink.base?.image;
  if (!image) return '';
  const { width, height } = ink.size;
  return `<image href="${escapeAttr(image.href)}" width="${round(width)}" height="${round(height)}" preserveAspectRatio="xMidYMid meet"/>`;
}

/** A standalone SVG document with a `viewBox`, the background, and the embedded signature data so it reloads stroke for stroke. */
export function toSvgDocument(ink: Ink, { render, background }: ExportOptions): string {
  const w = round(ink.size.width);
  const h = round(ink.size.height);
  const bg = isTransparent(background) ? '' : `<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    signatureDataMarkup(toData(ink)) +
    bg +
    baseImageMarkup(ink) +
    toSvgMarkup(allStrokes(ink), render) +
    `</svg>`
  );
}

export function toSvgDataUrl(ink: Ink, options: ExportOptions): string {
  return `data:image/svg+xml;base64,${encodeBase64(toSvgDocument(ink, options))}`;
}

/** Decoded `<img>`s for base-layer images, so the synchronous PNG painter can draw them. Small LRU. */
const images = new Map<string, HTMLImageElement>();
const IMAGE_CACHE_SIZE = 8;

function imageFor({ href }: BaseImage): HTMLImageElement {
  let img = images.get(href);
  if (img) {
    images.delete(href);
  } else {
    img = new Image();
    img.src = href;
  }
  images.set(href, img);
  if (images.size > IMAGE_CACHE_SIZE) images.delete(images.keys().next().value!);
  return img;
}

/** Starts decoding the ink's base-layer image (if any), resolving once it can be painted. */
export async function prepareImages(ink: Pick<Ink, 'base'>): Promise<void> {
  const image = ink.base?.image;
  if (!image) return;
  try {
    await imageFor(image).decode();
  } catch {
    // An image that cannot be decoded is left out of PNG exports.
  }
}

/** `contain` fit of a `from`-sized picture into `to`, centred. */
function fit(from: Size, to: Size): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(to.width / from.width, to.height / from.height);
  const width = from.width * scale;
  const height = from.height * scale;
  return { x: (to.width - width) / 2, y: (to.height - height) / 2, width, height };
}

/**
 * Paints the ink onto a canvas and returns a PNG data URL, synchronously. A base-layer image that has
 * not finished decoding is left out: call `prepareImages` first when that matters.
 */
export function toPngDataUrl(ink: Ink, { render, background }: ExportOptions, scale = 1): string {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(ink.size.width * s));
  canvas.height = Math.max(1, Math.round(ink.size.height * s));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(canvas.width / ink.size.width, canvas.height / ink.size.height);
  if (!isTransparent(background)) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, ink.size.width, ink.size.height);
  }
  const image = ink.base?.image;
  if (image) {
    const img = imageFor(image);
    if (img.complete && img.naturalWidth > 0) {
      const box = fit(image.size, ink.size);
      ctx.drawImage(img, box.x, box.y, box.width, box.height);
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of allStrokes(ink)) {
    ctx.strokeStyle = stroke.color;
    for (const { d, width } of strokePaths(stroke, render)) {
      ctx.lineWidth = width;
      ctx.stroke(new Path2D(d));
    }
  }
  return canvas.toDataURL('image/png');
}
