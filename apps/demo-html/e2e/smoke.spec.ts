import { expect, test, type Locator, type Page } from '@playwright/test';

const SVG_DATA_URL = /^data:image\/svg\+xml;base64,.+/;

/** Draws one stroke with the real mouse across the drawing area inside `scope`. */
async function drawIn(page: Page, scope: Locator, y = 60): Promise<void> {
  const area = scope.locator('[part~="area"]');
  await area.scrollIntoViewIfNeeded();
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + y);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + y + 20, { steps: 10 });
  await page.mouse.up();
}

/** The section's raw value (inside its collapsible block). */
const rawValue = (section: Locator) => section.getByTestId('value');
const preview = (section: Locator) => section.getByRole('img', { name: 'Signature preview' });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('draw, undo, draw, submit: the native form submits an SVG data URL', async ({ page }) => {
  const section = page.getByTestId('default');
  const signature = section.getByRole('img', { name: 'Your signature' });
  const undo = section.getByRole('button', { name: 'Undo' });

  await drawIn(page, section, 60);
  await expect(signature).toBeVisible();

  await undo.click();
  await expect(signature).toBeHidden();
  await expect(undo).toBeDisabled();

  await drawIn(page, section, 80);
  await expect(signature).toBeVisible();

  // `labels` set as a property reached the element.
  await expect(section.getByRole('button', { name: 'Start over' })).toBeVisible();

  await section.getByRole('button', { name: 'Submit' }).click();
  await expect(section.locator('form > output')).toHaveText(SVG_DATA_URL);
  await section.getByText('Raw value').click();
  await expect(rawValue(section)).toHaveText(SVG_DATA_URL);
});

test('an empty required field blocks the submit', async ({ page }) => {
  const section = page.getByTestId('default');
  await section.getByRole('button', { name: 'Submit' }).click();
  await expect(section.locator('form > output')).toBeHidden();
});

test('headless: the page toolbar drives the field and follows dsf-history-change', async ({ page }) => {
  const section = page.getByTestId('headless');
  const undo = section.getByRole('button', { name: 'Undo' });
  const redo = section.getByRole('button', { name: 'Redo' });
  const startOver = section.getByRole('button', { name: 'Start over' });

  // actions="none": the element renders no built-in bar.
  await expect(section.locator('[part~="actions"]')).toBeHidden();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(startOver).toBeDisabled();

  await drawIn(page, section);
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
  await expect(startOver).toBeEnabled();
  await expect(preview(section)).toBeVisible();

  await undo.click();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await expect(startOver).toBeDisabled();
  await expect(preview(section)).toBeHidden();
  await expect(rawValue(section)).toHaveText('null');

  await redo.click();
  await expect(preview(section)).toBeVisible();
  await expect(rawValue(section)).toHaveText(SVG_DATA_URL);

  // Start over is one undoable entry.
  await startOver.click();
  await expect(startOver).toBeDisabled();
  await expect(undo).toBeEnabled();
  await expect(preview(section)).toBeHidden();
});

test('dialog: Save copies the dialog value into the page, Cancel discards it', async ({ page }) => {
  const section = page.getByTestId('dialog');
  const dialog = section.getByRole('dialog');
  await expect(rawValue(section)).toHaveText('null');
  await expect(dialog).toBeHidden();

  await section.getByRole('button', { name: 'Add signature' }).click();
  await expect(dialog).toBeVisible();
  await drawIn(page, dialog);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect(preview(section)).toBeVisible();
  await expect(rawValue(section)).toHaveText(SVG_DATA_URL);
  const saved = await rawValue(section).textContent();

  await section.getByRole('button', { name: 'Change signature' }).click();
  await expect(dialog.getByRole('button', { name: 'Clear' })).toBeEnabled();
  await drawIn(page, dialog, 100);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(rawValue(section)).toHaveText(saved!);

  await section.getByRole('button', { name: 'Change signature' }).click();
  await dialog.getByRole('button', { name: 'Clear' }).click();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(preview(section)).toBeHidden();
  await expect(rawValue(section)).toHaveText('null');
  await expect(section.getByRole('button', { name: 'Add signature' })).toBeVisible();
});

for (const id of ['custom-styles', 'pen-options', 'side-rail']) {
  test(`${id}: the section shows the value as an image and as raw text`, async ({ page }) => {
    const section = page.getByTestId(id);
    await drawIn(page, section);
    await expect(preview(section)).toBeVisible();
    await section.getByText('Raw value').click();
    await expect(rawValue(section)).toHaveText(SVG_DATA_URL);
  });
}

test('variants 2 and 3: top bar with ink colours, RTL side rail with translated labels', async ({ page }) => {
  const pen = page.getByTestId('pen-options');
  const penArea = (await pen.locator('[part~="area"]').boundingBox())!;
  const bar = (await pen.locator('[part~="actions"]').boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(penArea.y + 1);
  await expect(pen.locator('[part~="action-color"]')).toHaveCount(3);

  const rail = page.getByTestId('side-rail');
  const railArea = (await rail.locator('[part~="area"]').boundingBox())!;
  const actions = (await rail.locator('[part~="actions"]').boundingBox())!;
  expect(actions.x + actions.width).toBeLessThanOrEqual(railArea.x + 1);
  await expect(rail.getByRole('button', { name: 'נקה' })).toBeVisible();
});

test('custom styles: custom properties, ::part() and the styles sheet all reach the field', async ({ page }) => {
  const section = page.getByTestId('custom-styles');
  const style = (selector: string, property: string) =>
    section.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  expect(await style('[part~="area"]', 'border-top-left-radius')).toBe('12px'); // --dsf-radius
  expect(await style('[part~="action"]', 'border-top-left-radius')).toBe('999px'); // ::part(action)
  expect(await style('[part~="action"]', 'text-transform')).toBe('uppercase'); // styles
});

test('"All demos" links the README demo list when the page is served at the root', async ({ page }) => {
  test.skip((process.env.DSF_DEMO_BASE ?? '/') !== '/', 'under a sub-path the link goes one level up');
  await expect(page.getByRole('link', { name: 'All demos' })).toHaveAttribute(
    'href',
    'https://github.com/DenysSlobodianyk1996/digital-signature-field#demos',
  );
});
