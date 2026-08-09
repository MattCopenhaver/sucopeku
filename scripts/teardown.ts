/**
 * Removes a pull request's preview.
 *
 * See specs/001-delivery-pipeline/contracts/deployment.md C4. Idempotent:
 * deleting an already-deleted prefix succeeds.
 *
 * This cannot affect production, and not because of care taken here — the role
 * it runs under has no access to production's bucket at all (FR-016). A prefix
 * bug would fail with an access error rather than deleting the wrong thing.
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  type ObjectIdentifier,
} from '@aws-sdk/client-s3';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function main(): Promise<void> {
  const bucket = required('DEPLOY_BUCKET');
  const rawPrefix = required('DEPLOY_PREFIX');
  const prefix = rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}/`;

  if (prefix === '/' || prefix.trim() === '') {
    throw new Error('Refusing to tear down an empty prefix');
  }

  const s3 = new S3Client({});
  let continuationToken: string | undefined;
  let removed = 0;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects: ObjectIdentifier[] = (listed.Contents ?? [])
      .map(({ Key }) => Key)
      .filter((key): key is string => Boolean(key))
      .map((Key) => ({ Key }));

    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      removed += objects.length;
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(
    removed === 0
      ? `Nothing to remove under ${prefix} — already gone.`
      : `Removed ${removed} object(s) under ${prefix}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
