import { useState, type FormEvent } from 'react';
import { SignatureInput } from './SignatureInput';

export function App() {
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<FormDataEntryValue | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // `required` has already blocked submits while the field was empty
    setSubmitted(new FormData(e.currentTarget).get('signature'));
  }

  return (
    <form onSubmit={onSubmit}>
      <SignatureInput onChange={setSignature} />
      {signature && <img src={signature} alt="Your signature" />}
      <button>Submit</button>
      {submitted && <output>{String(submitted)}</output>}
    </form>
  );
}
