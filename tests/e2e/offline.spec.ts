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

/**
 * The worker writes to the cache after it has answered the page, so a
 * registered worker does not yet mean a populated cache. Switching the network
 * off in that gap fails for a reason no player would ever hit — they cannot go
 * offline between a response arriving and the browser storing it.
 */
async function waitForAssetsCached(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    for (const name of await caches.keys()) {
      const entries = await (await caches.open(name)).keys();
      const hasScript = entries.some((request) => request.url.endsWith('.js'));
      const hasStyles = entries.some((request) => request.url.endsWith('.css'));
      if (hasScript && hasStyles) return true;
    }
    return false;
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
    await waitForAssetsCached(page);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Sucopeku' })).toBeVisible();
    await expect(page.getByTestId('grid')).toBeVisible();
  });

  test('a puzzle address loads offline even if only the bare site was visited', async ({
    page,
    context,
  }) => {
    await page.goto('./');
    await waitForServiceWorker(page);
    await page.reload();
    await waitForAssetsCached(page);

    // The query is not part of the cache key, so this address was never fetched
    // and still resolves. Without that, offline works at / and fails at the only
    // kind of address a shared link ever has.
    await context.setOffline(true);
    await page.goto('./?puzzle=p07');

    await expect(page.getByTestId('grid')).toBeVisible();
    await expect(page.locator('.cell.given').first()).toBeVisible();
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
