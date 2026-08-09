import { expect, test, type Page } from '@playwright/test';

// Turning off the network and reloading is something any player can do, so this
// stays within Principle VIII. WebKit does not support service workers under
// Playwright's automation, so these run on Chromium and the mobile project.

async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active);
  });
}

test.describe('offline', () => {
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'WebKit does not expose service workers to automation',
  );

  test('the site still loads with the network switched off (SC-011)', async ({ page, context }) => {
    await page.goto('./');
    await waitForServiceWorker(page);

    // Give the worker a navigation to cache, so the situation matches a real
    // second visit rather than a first one.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();
    await expect(page.getByTestId('tagline')).toBeVisible();
  });

  test('with a network available the page comes from the network, not the cache (SC-012)', async ({
    page,
  }) => {
    await page.goto('./');
    await waitForServiceWorker(page);

    // A cached copy must never pin a visitor to an old version, so the entry
    // document is fetched network-first. Observing that the request actually
    // leaves is what proves a new publish would be picked up.
    let documentRequests = 0;
    page.on('request', (request) => {
      if (request.resourceType() === 'document') documentRequests += 1;
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();

    expect(
      documentRequests,
      'the entry document was served from cache while online',
    ).toBeGreaterThan(0);
  });
});
