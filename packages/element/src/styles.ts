/** Styling surface (ADR-0007): the baseline guide and the `styles` escape hatch. */

/** What the `styles` property accepts: CSS text, a constructed sheet, or a list of them. */
export type Styles = string | CSSStyleSheet | ReadonlyArray<string | CSSStyleSheet>;

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
