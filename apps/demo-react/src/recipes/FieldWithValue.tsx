import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import type { DigitalSignatureFieldProps } from '@digital-signature-field/element/jsx-react';
import { useRef, useState } from 'react';
import { useElementEvent } from './useElementEvent';
import { ValueView } from './ValueView';

/** A `<digital-signature-field>` with the given props, followed by a view of its current value. */
export function FieldWithValue(props: Omit<DigitalSignatureFieldProps, 'ref'>) {
  const ref = useRef<DigitalSignatureFieldElement>(null);
  const [value, setValue] = useState<string | null>(null);
  useElementEvent<{ value: string | null }>(ref, 'change', (detail) => setValue(detail.value));

  return (
    <>
      <digital-signature-field ref={ref} {...props} />
      <ValueView value={value} />
    </>
  );
}
