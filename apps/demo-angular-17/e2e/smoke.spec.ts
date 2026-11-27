import { expect, test, type Locator, type Page } from '@playwright/test';

/** Draws one stroke with the real mouse across the signature field inside `section`. */
async function drawIn(page: Page, section: Locator): Promise<void> {
  const box = await section.locator('digital-signature-field').boundingBox();
  if (!box) throw new Error('signature field not visible');
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 5 });
  await page.mouse.move(box.x + 160, box.y + 40, { steps: 5 });
  await page.mouse.up();
}

test('reactive forms (dsfCva): drawing sets the bound form value to an SVG data URL', async ({ page }) => {
  await page.goto('/');
  const section = page.getByTestId('reactive-forms');
  await expect(section.getByTestId('value')).toHaveText('null');
  await expect(section.getByTestId('status')).toHaveText('invalid');

  await drawIn(page, section);

  await expect(section.getByTestId('value')).toHaveText(/^data:image\/svg\+xml;base64,/);
  await expect(section.getByTestId('status')).toHaveText('valid');
});
