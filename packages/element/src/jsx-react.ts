/**
 * React JSX types for `<digital-signature-field>` (types only, no runtime code).
 *
 * Enable with `"types": ["@digital-signature-field/element/jsx-react"]` in `tsconfig.json`, or
 * `import type {} from '@digital-signature-field/element/jsx-react'`.
 *
 * React 19 sets a prop as a property when the element has a property of that name, so every
 * writable element property (`labels`, `penColors`, `penWidth`, …) is accepted as a prop.
 * Listen to `change` and `dsf-history-change` with `ref` + `addEventListener`.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { DigitalSignatureFieldElement } from './digital-signature-field';
import type { Labels } from './actions';
import type { SignatureData } from './value';

type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/** Writable, non-method properties the element adds on top of `HTMLElement`. */
type WritableKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: never[]) => unknown
    ? never
    : IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

type ElementProperties = {
  [K in Exclude<WritableKeys<DigitalSignatureFieldElement>, keyof HTMLElement>]?: DigitalSignatureFieldElement[K];
};

export type DigitalSignatureFieldProps = Omit<
  DetailedHTMLProps<HTMLAttributes<DigitalSignatureFieldElement>, DigitalSignatureFieldElement>,
  // React's `onChange` is a synthetic input event; the element's `change` is a CustomEvent. Use a ref listener.
  'onChange'
> &
  Omit<ElementProperties, 'value' | 'labels' | 'penColors'> & {
    name?: string;
    required?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    value?: string | SignatureData | null;
    labels?: Partial<Labels>;
    penColors?: readonly string[];
  };

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'digital-signature-field': DigitalSignatureFieldProps;
    }
  }
}
