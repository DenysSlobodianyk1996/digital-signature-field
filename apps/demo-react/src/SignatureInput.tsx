import '@digital-signature-field/element';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { useEffect, useRef } from 'react';

export function SignatureInput({ onChange }: { onChange: (v: string | null) => void }) {
  const ref = useRef<DigitalSignatureFieldElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const handle = (e: Event) => onChange((e as CustomEvent).detail.value);
    el.addEventListener('change', handle);
    return () => el.removeEventListener('change', handle);
  }, [onChange]);

  return (
    <digital-signature-field
      ref={ref}
      name="signature"
      required
      actions="undo redo clear"
      labels={{ clear: 'Start over' }}
    />
  );
}
