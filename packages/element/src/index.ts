import { DigitalSignatureFieldElement } from './digital-signature-field';

export { DigitalSignatureFieldElement };
export type { HistoryState } from './digital-signature-field';
export type { ActionsPosition, Labels } from './actions';

declare global {
  interface HTMLElementTagNameMap {
    'digital-signature-field': DigitalSignatureFieldElement;
  }
}

if (!customElements.get('digital-signature-field')) {
  customElements.define('digital-signature-field', DigitalSignatureFieldElement);
}
