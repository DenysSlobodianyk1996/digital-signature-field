import { expect, test, type Locator, type Page } from '@playwright/test';

// Recipe sections of the demo (docs/variants/): headless toolbar, preview + dialog, and the value view.

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

test('headless: the app toolbar drives the field and follows dsf-history-change', async ({ page }) => {
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
  await expect(preview(section)).toHaveCount(0);
  await expect(rawValue(section)).toHaveText('null');

  await redo.click();
  await expect(preview(section)).toBeVisible();
  await expect(rawValue(section)).toHaveText(SVG_DATA_URL);

  // Start over is one undoable entry.
  await startOver.click();
  await expect(startOver).toBeDisabled();
  await expect(undo).toBeEnabled();
  await expect(preview(section)).toHaveCount(0);
});

test('dialog: Save copies the dialog value into the form, Cancel discards it', async ({ page }) => {
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

  // The dialog opens on a copy of the saved value; Cancel leaves the form value alone.
  await section.getByRole('button', { name: 'Change signature' }).click();
  await expect(dialog.getByRole('button', { name: 'Clear' })).toBeEnabled();
  await drawIn(page, dialog, 100);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(rawValue(section)).toHaveText(saved!);

  // Clearing in the dialog and saving empties the form value.
  await section.getByRole('button', { name: 'Change signature' }).click();
  await dialog.getByRole('button', { name: 'Clear' }).click();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(preview(section)).toHaveCount(0);
  await expect(rawValue(section)).toHaveText('null');
  await expect(section.getByRole('button', { name: 'Add signature' })).toBeVisible();
});

for (const id of ['custom-styles', 'pen-options', 'side-rail']) {
  test(`${id}: the section shows the value as an image and as raw text`, async ({ page }) => {
    const section = page.getByTestId(id);
    await drawIn(page, section);
    await expect(preview(section)).toBeVisible();
    await section.getByText('Raw value').click();
    await expect(rawValue(section)).toBeVisible();
    await expect(rawValue(section)).toHaveText(SVG_DATA_URL);
  });
}

test('default (CVA mode): the form value shows as an image and as raw text', async ({ page }) => {
  const section = page.getByTestId('reactive-forms');
  await drawIn(page, section);
  await expect(preview(section)).toBeVisible();
  await section.getByText('Raw value').click();
  await expect(rawValue(section)).toHaveText(SVG_DATA_URL);
});

test('side rail: dir="rtl" puts the rail on the left with translated labels', async ({ page }) => {
  const section = page.getByTestId('side-rail');
  const area = (await section.locator('[part~="area"]').boundingBox())!;
  const rail = (await section.locator('[part~="actions"]').boundingBox())!;
  expect(rail.x + rail.width).toBeLessThanOrEqual(area.x + 1);
  await expect(section.getByRole('button', { name: 'נקה' })).toBeVisible();
});

test('pen options: the top bar offers ink colours', async ({ page }) => {
  const section = page.getByTestId('pen-options');
  const area = (await section.locator('[part~="area"]').boundingBox())!;
  const bar = (await section.locator('[part~="actions"]').boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(area.y + 1);
  await expect(section.locator('[part~="action-color"]')).toHaveCount(3);
});

test('custom styles: custom properties, ::part() and the styles sheet all reach the field', async ({ page }) => {
  const section = page.getByTestId('custom-styles');
  const style = (selector: string, property: string) =>
    section.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
  expect(await style('[part~="area"]', 'border-top-left-radius')).toBe('12px'); // --dsf-radius
  expect(await style('[part~="action"]', 'border-top-left-radius')).toBe('999px'); // ::part(action)
  expect(await style('[part~="action"]', 'text-transform')).toBe('uppercase'); // styles
});
