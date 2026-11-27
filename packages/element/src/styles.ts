/** Styling surface (ADR-0007): the baseline guide, focus ring and state styles, and the `styles` escape hatch. */

/** What the `styles` property accepts: CSS text, a constructed sheet, or a list of them. */
export type Styles = string | CSSStyleSheet | ReadonlyArray<string | CSSStyleSheet>;

/** Shared focus ring of the drawing area and the buttons. Blue #1a3fbf is 9:1 on white. */
export const FOCUS_RING = 'var(--dsf-focus-ring, 2px solid #1a3fbf)';

/** Appended to the element's shadow style sheet, after the base and actions styles. */
export const STYLING_CSS = `
  /* Baseline guide: decorative, under the ink, never exported. */
  .guide {
    position: absolute;
    left: 8%;
    right: 8%;
    top: 75%;
    border-top: 1px dashed var(--dsf-guide-color, #d1d5db);
    pointer-events: none;
  }
  .area:focus-visible {
    outline: ${FOCUS_RING};
    outline-offset: 2px;
  }
  :host(:state(invalid)) .area {
    border-color: var(--dsf-invalid-color, #b91c1c);
  }
`;

/** The sheets to adopt for a `styles` value, in order. */
export function toStyleSheets(styles: Styles | null | undefined): CSSStyleSheet[] {
  if (styles === null || styles === undefined) return [];
  const list = typeof styles === 'string' || styles instanceof CSSStyleSheet ? [styles] : styles;
  return list.map((item) => {
    if (typeof item !== 'string') return item;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(item);
    return sheet;
  });
}
