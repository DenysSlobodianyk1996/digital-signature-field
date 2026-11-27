/** UTF-8 text to base64. */
export function encodeBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Base64 to bytes. Throws on malformed input. */
export function decodeBase64(body: string): Uint8Array {
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}
