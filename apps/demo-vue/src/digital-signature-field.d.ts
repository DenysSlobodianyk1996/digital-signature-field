// Declares <digital-signature-field> for Vue templates, so props and `$event` are type-checked.
import type { HistoryState, Labels, SignatureData } from '@digital-signature-field/element';
import type { HTMLAttributes } from 'vue';

interface DigitalSignatureFieldProps extends HTMLAttributes {
  value?: string | SignatureData | null;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  actions?: string;
  labels?: Partial<Labels>;
  penColors?: readonly string[];
  onChange?: (event: CustomEvent<{ value: string | null }>) => void;
  'onDsf-history-change'?: (event: CustomEvent<HistoryState>) => void;
}

declare module 'vue' {
  interface GlobalComponents {
    'digital-signature-field': new () => { $props: DigitalSignatureFieldProps };
  }
}
