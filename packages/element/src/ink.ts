import { escapeAttr, round, toSvgMarkup, type RenderOptions } from './render';

/** One sampled pen position, in drawing-area coordinates. */
export interface Point {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

/** One continuous line of ink from pen-down to pen-up. */
export interface Stroke {
  color: string;
  width: number;
  points: Point[];
}

export interface Size {
  width: number;
  height: number;
}

/** Total path length of a stroke, in drawing-area pixels. */
export function strokeLength(stroke: Stroke): number {
  let length = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    const a = stroke.points[i - 1]!;
    const b = stroke.points[i]!;
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return length;
}

/** A standalone SVG document for the strokes, with a `viewBox` so it scales. */
export function toSvgDocument(
  strokes: readonly Stroke[],
  size: Size,
  options: RenderOptions,
  background = '#fff',
): string {
  const w = round(size.width);
  const h = round(size.height);
  const bg = background === 'transparent' ? '' : `<rect width="100%" height="100%" fill="${escapeAttr(background)}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    bg +
    toSvgMarkup(strokes, options) +
    `</svg>`
  );
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function toSvgDataUrl(strokes: readonly Stroke[], size: Size, options: RenderOptions): string {
  return `data:image/svg+xml;base64,${base64(toSvgDocument(strokes, size, options))}`;
}
