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
