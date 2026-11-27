import { expect, test, type Page } from '@playwright/test';

/** Draws one stroke across the drawing area with the real mouse. */
async function drawStroke(page: Page, y: number): Promise<void> {
  const box = (await page.locator('digital-signature-field [part~="area"]').boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + y);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + y + 20, { steps: 10 });
  await page.mouse.up();
}

test('draw, undo, draw, submit: the form submits an SVG data URL', async ({ page }) => {
  await page.goto('./');
  // The preview image follows the value reported through the `change` listener.
  const preview = page.getByRole('img', { name: 'Your signature' });
  const undo = page.getByRole('button', { name: 'Undo' });

  await drawStroke(page, 60);
  await expect(preview).toBeVisible();

  await undo.click();
  await expect(preview).toHaveCount(0);
  await expect(undo).toBeDisabled();

  await drawStroke(page, 80);
  await expect(preview).toBeVisible();

  // `labels` passed as a prop reached the element.
  await expect(page.getByRole('button', { name: 'Start over' })).toBeVisible();

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('form > output')).toHaveText(/^data:image\/svg\+xml;base64,.+/);
});
