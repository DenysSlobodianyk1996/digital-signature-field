# Strokes are the model; the SVG is drawn from them

The legacy component treated SVG `<polyline>` nodes as its state and found them through counter-based ids, which broke undo and value loading. The new element keeps ink as data: strokes of points, each point with `x`, `y`, `pressure` and `t`, stored in drawing-area coordinates. The live view is redrawn from that data as SVG with a `viewBox`. Input comes from native Pointer Events with pointer capture, and no gesture or drawing library is used. SVG keeps the value resolution-independent and makes resizing safe. Canvas is used only off-screen, to export PNG.

## Consequences

- Smoothing is on by default, and pressure-based width is optional. Both are applied when rendering, so the stored points stay raw.
- Only the first active pointer draws. A second finger is ignored.
