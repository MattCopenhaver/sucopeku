import { expect, test } from '@playwright/test';

// Runs only when SMOKE_URL is set, against a real deployment (FR-032). This is
// what makes a deployment verified rather than merely reported as successful:
// the deploy step can succeed while the site serves nothing usable.

test('the deployed site renders', async ({ page }) => {
  const response = await page.goto('./');

  expect(response?.status(), 'deployed site did not return a successful response').toBeLessThan(
    400,
  );
  await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();
  await expect(page.getByTestId('tagline')).toBeVisible();
});

test('the deployed site serves its assets', async ({ page }) => {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();

  // A deployment that wrote index.html before its assets would look fine to the
  // deploy step and broken here. See contracts/deployment.md C3.
  expect(failures, `requests failed on the deployed site:\n${failures.join('\n')}`).toEqual([]);
});
