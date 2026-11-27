import { afterEach, describe, expect, it } from 'vitest';
import type { DigitalSignatureFieldElement, SignatureData } from '@digital-signature-field/element';
import { decodeSvg, draw, exportedStrokes, mount } from './test-utils';

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll('style[data-test]').forEach((s) => s.remove());
  document.documentElement.removeAttribute('style');
});

function changeDetails(el: HTMLElement): unknown[] {
  const seen: unknown[] = [];
  el.addEventListener('change', (e) => seen.push((e as CustomEvent<{ value: unknown }>).detail.value));
  return seen;
}

type Rgba = [r: number, g: number, b: number, a: number];

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Decodes a PNG data URL: its pixel size and a reader for single pixels. */
async function png(dataUrl: unknown): Promise<{ width: number; height: number; at: (x: number, y: number) => Rgba }> {
  expect(String(dataUrl)).toMatch(/^data:image\/png;base64,/);
  const img = await loadImage(String(dataUrl));
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    at: (x, y) => [...ctx.getImageData(x, y, 1, 1).data] as Rgba,
  };
}

/** A solid-colour PNG made independently of the field. */
function solidPng(width: number, height: number, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
}

const svgUrl = (markup: string): string => `data:image/svg+xml;base64,${btoa(markup)}`;

/** An SVG the field did not produce: a 100x50 blue box. */
const FOREIGN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="#00f"/></svg>';

const baseImage = (el: DigitalSignatureFieldElement): SVGImageElement | null =>
  el.shadowRoot!.querySelector('[part~="ink"] image');

const SIGNATURE: SignatureData = {
  version: 1,
  width: 200,
  height: 100,
  strokes: [
    {
      color: '#00f',
      width: 4,
      points: [
        { x: 10, y: 10, pressure: 0.5, t: 0 },
        { x: 90, y: 40, pressure: 0.5, t: 16 },
      ],
    },
  ],
};

describe('value-format', () => {
  it('json makes the value and the change detail signature data', () => {
    const el = mount({ 'value-format': 'json' });
    const seen = changeDetails(el);
    draw(el, [[10, 10], [60, 10]]);
    const value = el.value as SignatureData;
    expect(value).toMatchObject({ version: 1, strokes: [{ color: '#000', width: 2 }] });
    expect(value.strokes[0]!.points.map(({ x, y }) => [x, y])).toEqual([[10, 10], [60, 10]]);
    expect(seen).toEqual([value]);
  });

  it('png makes the value and the change detail a PNG data URL', async () => {
    const el = mount({ 'value-format': 'png' });
    const seen = changeDetails(el);
    draw(el, [[10, 10], [60, 10]]);
    expect(seen).toEqual([el.value]);
    const image = await png(el.value);
    expect(image.at(35, 10)).toEqual([0, 0, 0, 255]);
  });

  it('svg is the default', () => {
    const el = mount();
    expect(el.valueFormat).toBe('svg');
    draw(el, [[10, 10], [60, 10]]);
    expect(el.value).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('switching the format emits nothing; the next change uses the new format', () => {
    const el = mount();
    const seen = changeDetails(el);
    draw(el, [[10, 10], [60, 10]]);
    el.valueFormat = 'json';
    expect(seen).toHaveLength(1);
    expect(el.value).toMatchObject({ version: 1 });
    draw(el, [[10, 50], [60, 50]]);
    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatch(/^data:image\/svg\+xml/);
    expect(seen[1]).toMatchObject({ version: 1, strokes: [{}, {}] });
  });

  it('is null while the field is empty, in every format', () => {
    for (const format of ['svg', 'png', 'json'] as const) {
      expect(mount({ 'value-format': format }).value).toBeNull();
    }
  });
});

describe('export methods', () => {
  it.each(['svg', 'png', 'json'] as const)('work whatever the value format is (%s)', async (format) => {
    const el = mount({ 'value-format': format });
    draw(el, [[10, 10], [60, 10]]);
    expect(el.toSVG()).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(exportedStrokes(el.toSVG())).toHaveLength(1);
    expect((await png(await el.toPNG())).at(35, 10)).toEqual([0, 0, 0, 255]);
    expect(el.toJSON()).toMatchObject({ version: 1, strokes: [{ color: '#000' }] });
  });

  it('toJSON() is null while the field is empty', () => {
    expect(mount().toJSON()).toBeNull();
  });

  it('toPNG({ scale }) multiplies the pixel size of the drawing area', async () => {
    const el = mount();
    el.value = SIGNATURE;
    expect(await png(await el.toPNG())).toMatchObject({ width: 200, height: 100 });
    expect(await png(await el.toPNG({ scale: 2 }))).toMatchObject({ width: 400, height: 200 });
  });
});

describe('background', () => {
  it('defaults to #fff, painted into SVG and PNG exports', async () => {
    const el = mount();
    el.value = SIGNATURE;
    expect(el.background).toBe('#fff');
    expect(decodeSvg(el.toSVG()).querySelector('rect')?.getAttribute('fill')).toBe('#fff');
    expect((await png(await el.toPNG())).at(1, 1)).toEqual([255, 255, 255, 255]);
  });

  it('takes any CSS colour', async () => {
    const el = mount({ background: 'rgb(255, 0, 0)' });
    el.value = SIGNATURE;
    expect(decodeSvg(el.toSVG()).querySelector('rect')?.getAttribute('fill')).toBe('rgb(255, 0, 0)');
    expect((await png(await el.toPNG())).at(1, 1)).toEqual([255, 0, 0, 255]);
  });

  it('transparent paints nothing', async () => {
    const el = mount({ background: 'transparent' });
    el.value = SIGNATURE;
    expect(decodeSvg(el.toSVG()).querySelector('rect')).toBeNull();
    expect((await png(await el.toPNG())).at(1, 1)[3]).toBe(0);
  });

  it('is painted into the value too', async () => {
    const el = mount({ 'value-format': 'png', background: '#0f0' });
    draw(el, [[10, 10], [60, 10]]);
    expect((await png(el.value)).at(1, 1)).toEqual([0, 255, 0, 255]);
  });
});

describe('exports ignore page CSS', () => {
  it('a dark-themed page produces the same export', async () => {
    const el = mount();
    el.value = SIGNATURE;
    const svg = el.toSVG();
    const image = await el.toPNG();

    const style = document.createElement('style');
    style.dataset['test'] = '';
    style.textContent = `
      :root { color-scheme: dark; background: #000; color: #fff; }
      digital-signature-field { color: #fff; --dsf-area-bg: #000; }
      svg, path, polyline, rect { fill: #f0f !important; stroke: #f0f !important; }
    `;
    document.head.append(style);

    expect(el.toSVG()).toBe(svg);
    expect(await el.toPNG()).toBe(image);
    const pixels = await png(image);
    expect(pixels.at(1, 1)).toEqual([255, 255, 255, 255]);
    expect(pixels.at(50, 25)).toEqual([0, 0, 255, 255]); // on the blue stroke (10,10)-(90,40)
  });
});

describe('PNG and foreign SVG values load as a base-layer image', () => {
  it('a PNG renders, can be cleared, and comes back on undo', async () => {
    const value = solidPng(40, 20, '#f00');
    const el = mount();
    el.value = value;
    expect(el.empty).toBe(false);
    expect(baseImage(el)?.getAttribute('href')).toBe(value);
    expect((await png(await el.toPNG())).at(20, 10)).toEqual([255, 0, 0, 255]);
    expect(decodeSvg(el.value).documentElement.getAttribute('viewBox')).toBe('0 0 40 20');

    const seen = changeDetails(el);
    el.clear();
    expect(el.empty).toBe(true);
    expect(el.value).toBeNull();
    expect(baseImage(el)).toBeNull();

    el.undo();
    expect(baseImage(el)?.getAttribute('href')).toBe(value);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatch(/^data:image\/svg\+xml/);
  });

  it.each([
    ['base64', svgUrl(FOREIGN_SVG)],
    ['percent-encoded', `data:image/svg+xml,${encodeURIComponent(FOREIGN_SVG)}`],
  ])('a foreign SVG (%s) renders as an image at its own size', async (_, value) => {
    const el = mount();
    el.value = value;
    expect(el.empty).toBe(false);
    expect(baseImage(el)?.getAttribute('href')).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(decodeSvg(el.value).documentElement.getAttribute('viewBox')).toBe('0 0 100 50');
    expect((await png(await el.toPNG())).at(50, 25)).toEqual([0, 0, 255, 255]);
  });

  it('strokes drawn on top are exported with the image, and undo stops at it', () => {
    const el = mount();
    el.value = solidPng(400, 200, '#f00');
    draw(el, [[10, 10], [60, 10]]);
    expect(exportedStrokes(el.value)).toHaveLength(1);
    expect(decodeSvg(el.value).querySelector('image')).not.toBeNull();
    el.undo();
    expect(el.canUndo).toBe(false);
    expect(el.empty).toBe(false);
  });

  it('reloads an exported image-with-strokes SVG losslessly', () => {
    const el = mount();
    el.value = solidPng(400, 200, '#f00');
    draw(el, [[10, 10], [60, 10]]);
    const other = mount();
    other.value = el.value;
    expect(other.toJSON()).toEqual(el.toJSON());
    expect(baseImage(other)).not.toBeNull();
  });

  it('a value that is neither signature data, PNG nor SVG empties the field', () => {
    const el = mount();
    el.value = SIGNATURE;
    el.value = 'data:text/html,<script>alert(1)</script>';
    expect(el.empty).toBe(true);
  });
});

describe('json values', () => {
  it('round-trip: load, then toJSON() gives deep-equal signature data', () => {
    const el = mount();
    el.value = structuredClone(SIGNATURE);
    expect(el.toJSON()).toEqual(SIGNATURE);
  });

  it('round-trip through the value in json format', () => {
    const el = mount({ 'value-format': 'json' });
    el.value = structuredClone(SIGNATURE);
    expect(el.value).toEqual(SIGNATURE);
  });

  it('signature data with an image round-trips too', () => {
    const data: SignatureData = { ...SIGNATURE, image: solidPng(20, 10, '#0f0') };
    const el = mount();
    el.value = structuredClone(data);
    expect(el.toJSON()).toEqual(data);
    expect(baseImage(el)).not.toBeNull();
  });
});

describe('loaded values are parsed, never injected', () => {
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));

  it('a malicious foreign SVG cannot run script', async () => {
    const w = window as { __dsfPwned?: number };
    delete w.__dsfPwned;
    const el = mount();
    el.value = svgUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="window.__dsfPwned=1">' +
        '<script>window.__dsfPwned=2</script>' +
        '<image href="x" onerror="window.__dsfPwned=3"/>' +
        '<foreignObject><img xmlns="http://www.w3.org/1999/xhtml" src="x" onerror="window.__dsfPwned=4"/></foreignObject>' +
        '</svg>',
    );
    await nextFrame();
    await el.toPNG();
    await nextFrame();
    expect(w.__dsfPwned).toBeUndefined();
    const root = el.shadowRoot!;
    expect(root.querySelectorAll('script, foreignObject, [onload], [onerror]')).toHaveLength(0);
    expect([...root.querySelectorAll('[part~="ink"] *')].map((n) => n.localName)).toEqual(['image']);
  });

  it('signature data with markup in its fields cannot inject elements', async () => {
    const w = window as { __dsfPwned?: number };
    delete w.__dsfPwned;
    const evil = '#000"/><script>window.__dsfPwned=1</script><polyline onload="window.__dsfPwned=2" points="';
    const el = mount();
    el.value = { ...SIGNATURE, strokes: [{ ...SIGNATURE.strokes[0]!, color: evil }] };
    await nextFrame();
    expect(w.__dsfPwned).toBeUndefined();
    expect(el.shadowRoot!.querySelectorAll('script, [onload]')).toHaveLength(0);
    expect(el.shadowRoot!.querySelectorAll('[part~="ink"] > *')).toHaveLength(1);
    expect(decodeSvg(el.toSVG()).querySelectorAll('script, [onload]')).toHaveLength(0);
  });

  it('an image value that is not a PNG or SVG data URL is not loaded', () => {
    const el = mount();
    el.value = { ...SIGNATURE, image: 'javascript:alert(1)' };
    expect(el.empty).toBe(true);
    expect(baseImage(el)).toBeNull();
  });
});

describe('legacy regressions', () => {
  it('exported image has a transparent background', async () => {
    const el = mount();
    draw(el, [[10, 10], [60, 10]]);
    expect(decodeSvg(el.value).querySelector('rect')?.getAttribute('fill')).toBe('#fff');
    const pixels = await png(await el.toPNG());
    expect(pixels.at(1, 1)).toEqual([255, 255, 255, 255]);
    expect(pixels.at(pixels.width - 2, pixels.height - 2)).toEqual([255, 255, 255, 255]);
  });
});

describe('in a form', () => {
  function inForm(attrs: Record<string, string>): { form: HTMLFormElement; el: DigitalSignatureFieldElement } {
    const form = document.createElement('form');
    document.body.append(form);
    const el = mount({ name: 'signature', ...attrs });
    form.append(el);
    return { form, el };
  }

  it('json values are submitted as JSON text', () => {
    const { form, el } = inForm({ 'value-format': 'json' });
    el.value = structuredClone(SIGNATURE);
    expect(JSON.parse(new FormData(form).get('signature') as string)).toEqual(SIGNATURE);
  });

  it('png values are submitted as the PNG data URL', () => {
    const { form, el } = inForm({ 'value-format': 'png' });
    draw(el, [[10, 10], [60, 10]]);
    expect(new FormData(form).get('signature')).toBe(el.value);
  });

  it('a loaded image satisfies required and min-strokes', () => {
    const { el } = inForm({ required: '', 'min-strokes': '3' });
    expect(el.checkValidity()).toBe(false);
    el.value = solidPng(40, 20, '#f00');
    expect(el.checkValidity()).toBe(true);
    el.clear();
    expect(el.validity.valueMissing).toBe(true);
  });
});
