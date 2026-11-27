/** Built-in buttons of the actions bar (ADR-0008). */
export type HistoryAction = 'undo' | 'redo' | 'clear';

/** Built-in actions shown when nothing else is configured. */
export const DEFAULT_ACTIONS: readonly HistoryAction[] = ['undo', 'clear'];

export const DEFAULT_ACTION_LABELS: Readonly<Record<HistoryAction, string>> = {
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear',
};

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
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dsf-gap, 4px);
    margin-top: var(--dsf-gap, 4px);
  }
  .action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: var(--dsf-button-size, 32px);
    height: var(--dsf-button-size, 32px);
    padding: 0 4px;
    border: 0;
    border-radius: var(--dsf-radius, 4px);
    background: var(--dsf-button-bg, transparent);
    color: var(--dsf-button-color, currentColor);
    font: inherit;
    cursor: pointer;
  }
  .action:hover:not(:disabled) {
    background: var(--dsf-button-hover-bg, rgb(0 0 0 / 0.06));
  }
  .action:focus-visible {
    outline: var(--dsf-focus-ring, 2px solid #1a3fbf);
    outline-offset: 2px;
  }
  .action:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

/** A built-in action button. The element dispatches clicks by `data-action`. */
export function createActionButton(action: HistoryAction, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'action';
  button.setAttribute('part', `action action-${action}`);
  button.dataset['action'] = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = ICONS[action];
  return button;
}
