/**
 * Publishes a built site into a bucket prefix.
 *
 * The ORDER of the steps below is the contract, not an implementation detail.
 * See specs/001-delivery-pipeline/contracts/deployment.md C3.
 *
 *   1. Upload every hashed asset.
 *   2. Verify they all succeeded. If not, stop — index.html is untouched and the
 *      previous version is still serving correctly (FR-020).
 *   3. Upload index.html.
 *   4. Invalidate that one path.
 *
 * Because asset filenames contain a hash of their contents, a new version's
 * files never collide with the old version's. Both sets coexist, so a visitor
 * holding the old index.html keeps resolving every reference it makes. The only
 * mutable object is index.html, and replacing it is atomic — which is why no
 * visitor can ever assemble a page from two versions (FR-018).
 *
 * Nothing here deletes anything. Production's credentials cannot delete at all.
 */
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ENTRY_DOCUMENT = 'index.html';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function contentTypeFor(key: string): string {
  const dot = key.lastIndexOf('.');
  return (dot === -1 ? undefined : CONTENT_TYPES[key.slice(dot)]) ?? 'application/octet-stream';
}

/**
 * Hashed assets are immutable and cached for a year. index.html and the service
 * worker are not: index.html is the object a publish replaces, and a stale
 * cached service worker would strand visitors on an old version. See contract C2.
 */
function cacheControlFor(key: string): string {
  if (key === ENTRY_DOCUMENT || key === 'sw.js') return 'no-cache';
  return 'public, max-age=31536000, immutable';
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function filesUnder(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else found.push(full);
    }
  }
  await walk(root);
  return found;
}

async function main(): Promise<void> {
  const bucket = required('DEPLOY_BUCKET');
  const distributionId = required('DEPLOY_DISTRIBUTION_ID');
  const sourceDir = process.env.DEPLOY_SOURCE ?? 'site/dist';
  // Empty for production (distribution root); `pr-<n>/` for a preview.
  const rawPrefix = process.env.DEPLOY_PREFIX ?? '';
  const prefix = rawPrefix && !rawPrefix.endsWith('/') ? `${rawPrefix}/` : rawPrefix;

  const s3 = new S3Client({});
  const cloudfront = new CloudFrontClient({});

  const all = await filesUnder(sourceDir);
  const keyed = all.map((file) => ({
    file,
    key: prefix + relative(sourceDir, file).split(sep).join(posix.sep),
  }));

  const entry = keyed.find(({ key }) => key === `${prefix}${ENTRY_DOCUMENT}`);
  if (!entry) throw new Error(`No ${ENTRY_DOCUMENT} found in ${sourceDir}`);
  const assets = keyed.filter((item) => item !== entry);

  async function upload(file: string, key: string): Promise<void> {
    const { size } = await stat(file);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: createReadStream(file),
        ContentLength: size,
        ContentType: contentTypeFor(key),
        CacheControl: cacheControlFor(key.slice(prefix.length)),
      }),
    );
  }

  // Step 1 and 2: every asset lands, and any failure stops us here — before the
  // entry document is touched.
  console.log(`Uploading ${assets.length} asset(s) to s3://${bucket}/${prefix}`);
  await Promise.all(assets.map(({ file, key }) => upload(file, key)));

  // Step 3: the single mutable write. Everything it references is already in
  // place.
  console.log(`Uploading ${ENTRY_DOCUMENT}`);
  await upload(entry.file, entry.key);

  // Step 4: one path, which keeps this inside CloudFront's free allowance.
  const invalidationPaths = [`/${prefix}${ENTRY_DOCUMENT}`, `/${prefix}`];
  console.log(`Invalidating ${invalidationPaths.join(' ')}`);
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `deploy-${Date.now()}`,
        Paths: { Quantity: invalidationPaths.length, Items: invalidationPaths },
      },
    }),
  );

  console.log('Published.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
