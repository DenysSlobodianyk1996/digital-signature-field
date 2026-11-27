import { decodeBase64, encodeBase64 } from './base64';
import type { Size } from './ink';

/**
 * A base-layer image (ADR-0006): a PNG, or an SVG the field did not produce. `href` is a base64 data
 * URL the field rebuilt itself, so it is safe to put in an attribute, and as an SVG `<image>` it is
 * shown as a picture: scripts in it never run.
 */
export interface BaseImage {
  href: string;
  size: Size;
}

/** Size a browser gives a replaced element it cannot size (CSS default). */
const FALLBACK_SIZE: Size = { width: 300, height: 150 };

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** A `data:` URL split into its media type, parameters and body. */
function splitDataUrl(url: string): { type: string; base64: boolean; body: string } | null {
  const match = /^data:([^;,]*)((?:;[^,]*)?),(.*)$/s.exec(url.trim());
  if (!match) return null;
  const [, type = '', params = '', body = ''] = match;
  return { type: type.toLowerCase(), base64: /;base64$/i.test(params), body };
}

/** The text of an SVG data URL (base64 or percent-encoded), or `null` when it is not one. */
export function decodeSvgDataUrl(url: string): string | null {
  const parts = splitDataUrl(url);
  if (!parts || parts.type !== 'image/svg+xml') return null;
  try {
    return parts.base64 ? new TextDecoder().decode(decodeBase64(parts.body)) : decodeURIComponent(parts.body);
  } catch {
    return null;
  }
}

function fromPngDataUrl(url: string): BaseImage | null {
  const parts = splitDataUrl(url);
  if (!parts || parts.type !== 'image/png' || !parts.base64) return null;
  const body = parts.body.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return null;
  let header: Uint8Array;
  try {
    header = decodeBase64(body.slice(0, 32)); // signature + IHDR chunk header + width + height
  } catch {
    return null;
  }
  if (header.length < 24 || PNG_SIGNATURE.some((b, i) => header[i] !== b)) return null;
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) return null;
  return { href: `data:image/png;base64,${body}`, size: { width, height } };
}

const length = (attr: string | null): number | null => {
  const match = attr && /^\s*([\d.]+)\s*(px)?\s*$/.exec(attr);
  const n = match ? Number(match[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Intrinsic size of an SVG: its `width`/`height` in px, else its `viewBox`, else the CSS default. */
function svgSize(svg: Element): Size {
  const viewBox = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  const vbWidth = viewBox.length === 4 && viewBox[2]! > 0 ? viewBox[2]! : null;
  const vbHeight = viewBox.length === 4 && viewBox[3]! > 0 ? viewBox[3]! : null;
  let width = length(svg.getAttribute('width'));
  let height = length(svg.getAttribute('height'));
  if (vbWidth && vbHeight) {
    width ??= height ? (height * vbWidth) / vbHeight : vbWidth;
    height ??= (width * vbHeight) / vbWidth;
  }
  return width && height ? { width, height } : FALLBACK_SIZE;
}

/** Parses an SVG document as data (never inserted into the page). `null` when it is not well-formed SVG. */
export function parseSvg(xml: string): Document | null {
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg') return null;
  if (doc.getElementsByTagName('parsererror').length > 0) return null;
  return doc;
}

function fromSvgText(xml: string): BaseImage | null {
  const doc = parseSvg(xml);
  if (!doc) return null;
  return { href: `data:image/svg+xml;base64,${encodeBase64(xml)}`, size: svgSize(doc.documentElement) };
}

/** Reads a PNG or SVG data URL as a base-layer image. `null` when it is neither. */
export function parseImageDataUrl(url: string): BaseImage | null {
  const svg = decodeSvgDataUrl(url);
  return svg === null ? fromPngDataUrl(url) : fromSvgText(svg);
}
