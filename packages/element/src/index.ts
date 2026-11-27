import { DigitalSignatureFieldElement } from './digital-signature-field';

export { DigitalSignatureFieldElement };

declare global {
  interface HTMLElementTagNameMap {
    'digital-signature-field': DigitalSignatureFieldElement;
  }
}

if (!customElements.get('digital-signature-field')) {
  customElements.define('digital-signature-field', DigitalSignatureFieldElement);
}
