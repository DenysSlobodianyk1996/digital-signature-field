import { expect, test, type Locator, type Page } from '@playwright/test';

/** Draws one stroke across the drawing area inside `scope` with the real mouse. */
async function drawStroke(page: Page, scope: Locator, y: number): Promise<void> {
  const box = (await scope.locator('[part~="area"]').boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + y);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + y + 20, { steps: 10 });
  await page.mouse.up();
}

test('draw, undo, draw, submit: the form submits an SVG data URL', async ({ page }) => {
  await page.goto('./');
  // The Default section holds the README recipe.
  const section = page.getByTestId('default');
  // The preview image follows the value reported through the `change` listener.
  const preview = section.getByRole('img', { name: 'Your signature' });
  const undo = section.getByRole('button', { name: 'Undo' });

  await drawStroke(page, section, 60);
  await expect(preview).toBeVisible();

  await undo.click();
  await expect(preview).toHaveCount(0);
  await expect(undo).toBeDisabled();

  await drawStroke(page, section, 80);
  await expect(preview).toBeVisible();

  // `labels` passed as a prop reached the element.
  await expect(section.getByRole('button', { name: 'Start over' })).toBeVisible();

  await section.getByRole('button', { name: 'Submit' }).click();
  await expect(section.locator('form > output')).toHaveText(/^data:image\/svg\+xml;base64,.+/);
});
