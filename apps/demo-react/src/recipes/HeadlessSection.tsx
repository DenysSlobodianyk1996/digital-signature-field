import type { DigitalSignatureFieldElement, HistoryState } from '@digital-signature-field/element';
import { useRef, useState } from 'react';
import { useElementEvent } from './useElementEvent';
import { ValueView } from './ValueView';

/** Variant 4: `actions="none"`, the app's own toolbar driven by `dsf-history-change`. */
export function HeadlessSection() {
  const ref = useRef<DigitalSignatureFieldElement>(null);
  const [history, setHistory] = useState<HistoryState>({ canUndo: false, canRedo: false, empty: true });
  const [value, setValue] = useState<string | null>(null);

  useElementEvent<HistoryState>(ref, 'dsf-history-change', setHistory);
  useElementEvent<{ value: string | null }>(ref, 'change', (detail) => setValue(detail.value));

  return (
    <section data-testid="headless">
      <h2>Headless with the app's own toolbar</h2>
      <p>
        <code>actions="none"</code> hides the built-in bar. The buttons below call <code>undo()</code>,{' '}
        <code>redo()</code> and <code>clear()</code>, and <code>dsf-history-change</code> enables them.
      </p>
      <digital-signature-field ref={ref} actions="none" />
      <div className="toolbar" role="toolbar" aria-label="Signature">
        <button type="button" onClick={() => ref.current?.undo()} disabled={!history.canUndo}>
          Undo
        </button>
        <button type="button" onClick={() => ref.current?.redo()} disabled={!history.canRedo}>
          Redo
        </button>
        <button type="button" onClick={() => ref.current?.clear()} disabled={history.empty}>
          Start over
        </button>
      </div>
      <ValueView value={value} />
    </section>
  );
}
