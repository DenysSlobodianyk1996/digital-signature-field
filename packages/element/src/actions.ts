/** Built-in actions of the actions bar (ADR-0008). */
export type HistoryAction = 'undo' | 'redo' | 'clear';
export type PenAction = 'color' | 'width';
export type BuiltInAction = HistoryAction | PenAction;

/** Where the actions bar sits. `start` and `end` are logical sides that follow `dir`. */
export type ActionsPosition = 'bottom' | 'top' | 'start' | 'end';

export const ACTIONS_POSITIONS: readonly ActionsPosition[] = ['bottom', 'top', 'start', 'end'];

const BUILT_IN_ACTIONS: readonly BuiltInAction[] = ['undo', 'redo', 'clear', 'color', 'width'];

/** The `actions` attribute when it is absent. */
export const DEFAULT_ACTIONS = 'undo clear';

export const DEFAULT_PEN_COLORS: readonly string[] = ['#000', '#1a3fbf'];

/** The three widths offered by the `width` action, thinnest first. */
export const PEN_WIDTHS: readonly [thin: number, medium: number, thick: number] = [1, 2, 4];

/** Texts of the built-in buttons, the drawing area's accessible name and the status messages. */
export interface Labels {
  undo: string;
  redo: string;
  clear: string;
  /** Accessible name of the pen colour swatch group. */
  color: string;
  /** Accessible name of the pen width group. */
  width: string;
  thin: string;
  medium: string;
  thick: string;
  drawingArea: string;
  /** Announced when the field becomes empty. */
  emptyStatus: string;
  /** Announced when the field becomes signed. */
  signedStatus: string;
}

export const DEFAULT_LABELS: Readonly<Labels> = {
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear',
  color: 'Pen colour',
  width: 'Pen width',
  thin: 'Thin',
  medium: 'Medium',
  thick: 'Thick',
  drawingArea: 'Signature drawing area',
  emptyStatus: 'Signature is empty',
  signedStatus: 'Signature added',
};

/**
 * The built-in actions named by an `actions` value, in order, without unknown or repeated tokens.
 * `null` means headless mode (`none`): no actions bar at all.
 */
export function parseActions(value: string): BuiltInAction[] | null {
  const tokens = value.trim().toLowerCase().split(/\s+/);
  if (tokens.includes('none')) return null;
  return [...new Set(tokens)].filter((t): t is BuiltInAction => (BUILT_IN_ACTIONS as string[]).includes(t));
}

const icon = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const ICONS: Readonly<Record<HistoryAction, string>> = {
  undo: icon('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: icon('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  clear: icon(
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>' +
      '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  ),
};

/** Styles for the actions bar and its buttons, appended to the element's shadow style sheet. */
export const ACTIONS_CSS = `
  .actions,
  .builtins,
  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dsf-gap, 4px);
  }
  .actions {
    justify-content: flex-end;
  }
  .actions[hidden] {
    display: none;
  }
  .root[data-position='start'] .actions,
  .root[data-position='end'] .actions,
  .root[data-position='start'] .builtins,
  .root[data-position='end'] .builtins,
  .root[data-position='start'] .group,
  .root[data-position='end'] .group {
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
  .root[data-position='start'] .builtins,
  .root[data-position='end'] .builtins {
    flex: 1;
  }
  /* In a rail, the destructive Clear sits apart from the other actions (variant 3). */
  .root[data-position='start'] .action[data-action='clear'],
  .root[data-position='end'] .action[data-action='clear'] {
    margin-top: auto;
  }
  .root[data-position='start'] .label,
  .root[data-position='end'] .label {
    display: none;
  }
  .action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-sizing: border-box;
    min-width: var(--dsf-button-size, 32px);
    height: var(--dsf-button-size, 32px);
    padding: 0 4px;
    /* Defaults meet WCAG AA on a white page: text #1f2937 is 14.7:1, the #6b7280 boundary 4.8:1. */
    border: 1px solid #6b7280;
    border-radius: var(--dsf-radius, 4px);
    background: var(--dsf-button-bg, #fff);
    color: var(--dsf-button-color, #1f2937);
    font: inherit;
    cursor: pointer;
  }
  .action:hover:not(:disabled) {
    background: var(--dsf-button-hover-bg, #f3f4f6);
  }
  .action:focus-visible {
    outline: var(--dsf-focus-ring, 2px solid #1a3fbf);
    outline-offset: 2px;
  }
  .action:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .action[aria-pressed='true'] {
    box-shadow: inset 0 0 0 2px var(--dsf-button-color, #1f2937);
  }
  .swatch {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--swatch);
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.2);
  }
`;

function baseButton(action: BuiltInAction, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'action';
  button.setAttribute('part', `action action-${action}`);
  button.dataset['action'] = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  return button;
}

/** An undo, redo or clear button: icon plus visible label (hidden in a side rail). */
export function createActionButton(action: HistoryAction, label: string): HTMLButtonElement {
  const button = baseButton(action, label);
  button.innerHTML = ICONS[action];
  const text = document.createElement('span');
  text.className = 'label';
  text.textContent = label;
  button.append(text);
  return button;
}

function group(label: string, buttons: HTMLButtonElement[]): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'group';
  div.setAttribute('role', 'group');
  div.setAttribute('aria-label', label);
  div.append(...buttons);
  return div;
}

/** The `color` action: one toggle button per pen colour. */
export function createColorGroup(colors: readonly string[], labels: Labels): HTMLDivElement {
  return group(
    labels.color,
    colors.map((color) => {
      const button = baseButton('color', color);
      button.dataset['value'] = color;
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.setProperty('--swatch', color);
      button.append(swatch);
      return button;
    }),
  );
}

/** The `width` action: thin, medium and thick toggle buttons. */
export function createWidthGroup(labels: Labels): HTMLDivElement {
  const names = [labels.thin, labels.medium, labels.thick];
  return group(
    labels.width,
    PEN_WIDTHS.map((width, i) => {
      const button = baseButton('width', names[i]!);
      button.dataset['value'] = String(width);
      button.innerHTML =
        `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">` +
        `<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-linecap="round" ` +
        `stroke-width="${width * 1.5}"/></svg>`;
      return button;
    }),
  );
}
