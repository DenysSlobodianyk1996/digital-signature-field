/** Shows a signature value: the `<img>` preview (values are data URLs) and the raw value, collapsed. */
export function ValueView({ value, image = true }: { value: string | null; image?: boolean }) {
  return (
    <div className="value">
      {image && value && <img src={value} alt="Signature preview" />}
      <details>
        <summary>Raw value</summary>
        <output data-testid="value">{value ?? 'null'}</output>
      </details>
    </div>
  );
}
