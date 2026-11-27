import { useRef, useState } from 'react';
import { App } from '../App';
import { DialogSection } from './DialogSection';
import { FieldWithValue } from './FieldWithValue';
import { HeadlessSection } from './HeadlessSection';
import { useElementEvent } from './useElementEvent';
import { ValueView } from './ValueView';

/** Extra sheet adopted into the field's shadow root through the `styles` property. */
const FIELD_STYLES = `
  [part~="guide"] { border-top-style: solid; }
  [part~="action"] { text-transform: uppercase; letter-spacing: 0.04em; }
`;

/** The demo page: one section per recipe in docs/variants/. */
export function Demo() {
  return (
    <>
      <DefaultSection />
      <HeadlessSection />

      <section data-testid="custom-styles">
        <h2>Custom styles</h2>
        <p>
          Custom properties and <code>::part()</code> in the app's stylesheet (<code>.fancy-signature</code>), plus an
          extra sheet through the <code>styles</code> property.
        </p>
        <FieldWithValue className="fancy-signature" styles={FIELD_STYLES} />
      </section>

      <DialogSection />

      <section data-testid="pen-options">
        <h2>Actions bar above, with pen options</h2>
        <p>
          <code>actions="color width undo redo clear"</code>, <code>actionsPosition="top"</code>,{' '}
          <code>penColors</code> and <code>pressure</code>.
        </p>
        <FieldWithValue
          actions="color width undo redo clear"
          actionsPosition="top"
          penColors={['#000', '#1a3fbf', '#b91c1c']}
          pressure
        />
      </section>

      <section data-testid="side-rail">
        <h2>Side rail, right to left</h2>
        <p>
          <code>actionsPosition="end"</code> with <code>dir="rtl"</code>: the rail moves to the left. Labels are
          translated through <code>labels</code>.
        </p>
        <FieldWithValue
          dir="rtl"
          actions="undo redo clear"
          actionsPosition="end"
          labels={{ undo: 'בטל', redo: 'בצע שוב', clear: 'נקה' }}
        />
      </section>
    </>
  );
}

/** Variant 1: the README recipe (`App` + `SignatureInput`), unchanged, with its raw value. */
function DefaultSection() {
  const ref = useRef<HTMLElement>(null);
  const [value, setValue] = useState<string | null>(null);

  // `change` bubbles, so the section hears the recipe's field without touching the recipe.
  useElementEvent<{ value: string | null }>(ref, 'change', (detail) => setValue(detail.value));

  return (
    <section data-testid="default" ref={ref}>
      <h2>Default</h2>
      <p>
        The default layout, actions bar below the drawing area, in a native form with <code>required</code>. This is
        the README's React recipe.
      </p>
      <App />
      <ValueView value={value} image={false} />
    </section>
  );
}
