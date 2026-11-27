import type { Point, Stroke } from './ink';

/** How strokes are drawn. Applied at render time only: the stored points stay raw (ADR-0004). */
export interface RenderOptions {
  /** 0 draws raw polylines; up to 1 draws increasingly rounded curves through the points. */
  smoothing: number;
  /** Vary the width along each stroke with the recorded pen pressure, when the device reported any. */
  pressure: boolean;
}

export const round = (n: number): number => Math.round(n * 100) / 100;

export const escapeAttr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const xy = (p: { x: number; y: number }): string => `${round(p.x)},${round(p.y)}`;

/**
 * One cubic Bézier per pair of neighbouring points (Catmull-Rom style): each control point follows
 * the direction from the previous to the next point, scaled by `smoothing`. At 0.5 this is the
 * standard uniform Catmull-Rom curve.
 */
function curveSegments(points: readonly Point[], smoothing: number): string[] {
  const k = smoothing / 3;
  const segments: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    if (k === 0) {
      segments.push(`L${xy(points[i + 1]!)}`);
      continue;
    }
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
    segments.push(`C${xy(c1)} ${xy(c2)} ${xy(p2)}`);
  }
  return segments;
}

/**
 * Mouse and other pressure-less devices report 0.5 while a button is down (0 otherwise), so a stroke
 * has pressure data only when some point reports anything else.
 */
const hasPressureData = (points: readonly Point[]): boolean =>
  points.some((p) => p.pressure > 0 && p.pressure !== 0.5);

/** Width factor for a pressure in 0..1: 0.5x at no pressure, 1x at 0.5, 1.5x at full pressure. */
const pressureFactor = (pressure: number): number => 0.5 + Math.min(1, Math.max(0, pressure));

/** One outline to stroke: SVG path data and the width to stroke it with. */
export interface StrokePath {
  d: string;
  width: number;
}

/**
 * The same geometry `toSvgMarkup` draws, as path data, for painters that are not SVG (the PNG export).
 * A pressure stroke is one path per segment, each with its own width.
 */
export function strokePaths(stroke: Stroke, { smoothing, pressure }: RenderOptions): StrokePath[] {
  const { points } = stroke;
  if (points.length === 0) return [];
  if (pressure && points.length >= 2 && hasPressureData(points)) {
    return curveSegments(points, Math.max(0, smoothing)).map((segment, i) => ({
      d: `M${xy(points[i]!)} ${segment}`,
      width: stroke.width * pressureFactor((points[i]!.pressure + points[i + 1]!.pressure) / 2),
    }));
  }
  const segments = curveSegments(points, Math.max(0, smoothing));
  // A single point still paints a round dot, as an SVG polyline with round caps does.
  return [{ d: `M${xy(points[0]!)} ${segments.length ? segments.join(' ') : `L${xy(points[0]!)}`}`, width: stroke.width }];
}

function strokeMarkup(stroke: Stroke, { smoothing, pressure }: RenderOptions): string {
  const color = `stroke="${escapeAttr(stroke.color)}"`;
  const caps = `stroke-linecap="round" stroke-linejoin="round"`;
  const paint = `fill="none" ${color} stroke-width="${round(stroke.width)}" ${caps}`;
  const { points } = stroke;
  if (pressure && points.length >= 2 && hasPressureData(points)) {
    // SVG strokes have one width, so a pressure stroke is a group of segments, each with its own width.
    const segments = curveSegments(points, Math.max(0, smoothing)).map((segment, i) => {
      const width = stroke.width * pressureFactor((points[i]!.pressure + points[i + 1]!.pressure) / 2);
      return `<path d="M${xy(points[i]!)} ${segment}" stroke-width="${round(width)}"/>`;
    });
    return `<g fill="none" ${color} ${caps}>${segments.join('')}</g>`;
  }
  if (smoothing <= 0 || points.length < 2) {
    return `<polyline points="${points.map(xy).join(' ')}" ${paint}/>`;
  }
  return `<path d="M${xy(points[0]!)} ${curveSegments(points, smoothing).join(' ')}" ${paint}/>`;
}

/** SVG elements for the strokes, one per stroke (no wrapper). Ink carries no ids: the stroke list is the model. */
export function toSvgMarkup(strokes: readonly Stroke[], options: RenderOptions): string {
  return strokes.map((s) => strokeMarkup(s, options)).join('');
}
