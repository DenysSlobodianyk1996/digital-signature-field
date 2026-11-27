import { decodeSvgDataUrl, parseImageDataUrl, parseSvg, type BaseImage } from './image';
import type { Point, Size, Stroke } from './ink';

/** Lossless signature data: the strokes and the drawing-area size they were drawn in (docs/api.md). */
export interface SignatureData {
  version: 1;
  /** Size of the drawing area the strokes were drawn in. */
  width: number;
  height: number;
  strokes: Array<{
    color: string;
    width: number;
    points: Array<{ x: number; y: number; pressure: number; t: number }>;
  }>;
  /** A loaded PNG or foreign-SVG base layer (a data URL), painted under the strokes to fit `width` x `height`. */
  image?: string;
}

/**
 * A signature loaded from outside (ADR-0006). It shows as ink but is not undoable stroke by stroke:
 * strokes (field-made SVG or signature data), an image (PNG or foreign SVG), or an image with strokes.
 */
export interface BaseLayer {
  strokes: readonly Stroke[];
  image?: BaseImage;
}

/** What a loaded value turns into: the base layer and the size its coordinates are in. */
export interface LoadedValue {
  size: Size;
  base: BaseLayer;
}

/** Namespace of the element that carries signature data inside an exported SVG. */
const DATA_NS = 'https://github.com/DenysSlobodianyk1996/digital-signature-field';

export function toSignatureData(strokes: readonly Stroke[], size: Size, image?: BaseImage): SignatureData {
  const data: SignatureData = {
    version: 1,
    width: size.width,
    height: size.height,
    strokes: strokes.map((s) => ({
      color: s.color,
      width: s.width,
      points: s.points.map(({ x, y, pressure, t }) => ({ x, y, pressure, t })),
    })),
  };
  if (image) data.image = image.href;
  return data;
}

const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** SVG markup that embeds the signature data in an exported file, so it reloads stroke for stroke (ADR-0005). */
export function signatureDataMarkup(data: SignatureData): string {
  return `<metadata><dsf:signature xmlns:dsf="${DATA_NS}">${escapeText(JSON.stringify(data))}</dsf:signature></metadata>`;
}

const isNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const isObject = (o: unknown): o is Record<string, unknown> => typeof o === 'object' && o !== null;

function toPoint(p: unknown): Point | null {
  if (!isObject(p) || !isNumber(p['x']) || !isNumber(p['y'])) return null;
  return {
    x: p['x'],
    y: p['y'],
    pressure: isNumber(p['pressure']) ? p['pressure'] : 0.5,
    t: isNumber(p['t']) ? p['t'] : 0,
  };
}

function toStroke(s: unknown): Stroke | null {
  if (!isObject(s) || typeof s['color'] !== 'string' || !isNumber(s['width']) || !Array.isArray(s['points'])) {
    return null;
  }
  const points = s['points'].map(toPoint);
  if (points.length === 0 || points.some((p) => p === null)) return null;
  return { color: s['color'], width: s['width'], points: points as Point[] };
}

/** Validates signature data from an untrusted source. `null` when it is not version-1 signature data. */
export function fromSignatureData(data: unknown): LoadedValue | null {
  if (!isObject(data) || data['version'] !== 1) return null;
  const { width, height } = data;
  if (!isNumber(width) || !isNumber(height) || width <= 0 || height <= 0 || !Array.isArray(data['strokes'])) {
    return null;
  }
  const strokes = data['strokes'].map(toStroke);
  if (strokes.some((s) => s === null)) return null;
  const base: BaseLayer = { strokes: strokes as Stroke[] };
  if (data['image'] !== undefined) {
    const image = typeof data['image'] === 'string' ? parseImageDataUrl(data['image']) : null;
    if (!image) return null;
    base.image = image;
  }
  return { size: { width, height }, base };
}

/** Reads the signature data an SVG exported by the field carries. Parsed as XML, never inserted into the page. */
function fromFieldSvg(xml: string): LoadedValue | null {
  const carrier = parseSvg(xml)?.getElementsByTagNameNS(DATA_NS, 'signature')[0];
  if (!carrier?.textContent) return null;
  try {
    return fromSignatureData(JSON.parse(carrier.textContent));
  } catch {
    return null;
  }
}

/** A PNG or foreign SVG: the whole picture becomes the base layer, at its own size. */
function fromImage(url: string): LoadedValue | null {
  const image = parseImageDataUrl(url);
  return image && { size: image.size, base: { strokes: [], image } };
}

/** Whether a string value is JSON text (what a `value-format="json"` field submits to its form). */
export const isJsonText = (value: string): boolean => value.trimStart().startsWith('{');

/**
 * Turns a written `value` into what the field loads. `null` means "empty the field": the value was
 * `null`, an empty string, or something the field cannot read (not signature data, its JSON text, PNG or SVG).
 */
export function parseValue(value: unknown): LoadedValue | null {
  if (typeof value !== 'string') return fromSignatureData(value);
  if (value.trim() === '') return null;
  if (isJsonText(value)) {
    try {
      return fromSignatureData(JSON.parse(value));
    } catch {
      return null;
    }
  }
  const xml = decodeSvgDataUrl(value);
  return (xml !== null && fromFieldSvg(xml)) || fromImage(value);
}
