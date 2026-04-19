# 07 — Audio Storage

Cloudflare R2 object storage: bucket layout, path conventions, signed URL access, and lifecycle management.

---

## Why Cloudflare R2

R2 is S3-compatible (SDK: `@aws-sdk/client-s3`) with **no egress fees**. For a media application that streams MP3s to users, egress cost would be significant on S3. R2 eliminates it entirely.

---

## Bucket Strategy

| Bucket | Purpose |
|---|---|
| `vocescribe-prod` | Production data |
| `vocescribe-preview` | Preview / staging (per PR) |
| `vocescribe-dev` | Local development (optional: local MinIO or real R2 dev bucket) |

All buckets are **private** — no public access policies. All object reads go through server-side signed URLs.

---

## Object Key Convention

All objects are namespaced by `userId` and `bookId`:

```
{userId}/
  {bookId}/
    original.epub         ← source file (always preserved)
    cover.jpg             ← extracted + re-encoded cover (JPEG, quality 85)
    ch1.mp3               ← generated audio for chapter 1
    ch1_align.json        ← alignment data for chapter 1
    ch2.mp3
    ch2_align.json
    ...
```

`userId` is the Clerk user ID (e.g. `user_2abc123`). `bookId` is a UUID v4.

**Why this layout:** Deleting a book requires only a prefix-delete on `{userId}/{bookId}/` — one API call, no enumeration needed.

---

## R2 Client (`src/lib/storage/r2.ts`)

Wraps `@aws-sdk/client-s3` with application-specific helpers:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadObject(key: string, body: Buffer, contentType: string) { /* ... */ }
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> { /* ... */ }
export async function deletePrefix(prefix: string) { /* ... */ }
```

---

## Signed URLs

Clients never receive permanent R2 object paths. The API generates a signed URL server-side, after verifying ownership:

```typescript
// GET /api/v1/audio/{id}/stream
export async function GET(req, { params }) {
  const { userId } = await auth();
  const job = await resolveJobWithOwnershipCheck(params.id, userId);  // 403 if not owner

  const signedUrl = await getSignedDownloadUrl(job.audioR2Key, 3600);
  return Response.redirect(signedUrl, 302);
}
```

**Expiry:** 1 hour. If a user keeps the player open beyond 1 hour, the browser will receive a 403 from R2 on the next audio segment request. The player should detect this and refresh by calling the stream endpoint again.

---

## CORS Configuration

R2 buckets must be configured with CORS to allow audio streaming from the browser:

```json
[
  {
    "AllowedOrigins": ["https://vocescribe.app", "https://*.vercel.app"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply with:
```bash
wrangler r2 bucket cors put vocescribe-prod --file cors.json
```

---

## Book Deletion

When `DELETE /books/{id}` is called:

1. DB: book row deleted → cascades to chapters and audio_jobs
2. R2: prefix delete `{userId}/{bookId}/` — removes EPUB, cover, all chapter MP3s, all alignment JSONs

```typescript
await deletePrefix(`${userId}/${bookId}/`);
```

R2 prefix delete lists all objects under the prefix and sends a single `DeleteObjects` batch request. For large books (50+ chapters), this is still a single round trip.

---

## Storage Cost Reference

| Object type | Approx. size | Notes |
|---|---|---|
| EPUB source | 1–50 MB | Kept indefinitely while book exists |
| Cover JPEG | 50–200 KB | Displayed in library grid |
| Chapter MP3 | 5–50 MB | ~1 MB/minute of narration |
| Alignment JSON | 10–200 KB | One per chapter |

Average 300-page book: ~90 K chars → ~30 min audio → ~300 MB total storage per book.

At Cloudflare R2 pricing ($0.015/GB/month), 1 TB of storage = ~$15/month.

---

## Local Development

For local development without a real R2 bucket, use [MinIO](https://min.io/) with the same `@aws-sdk/client-s3` client pointing to `localhost:9000`:

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Set in `.env.local`:
```
R2_ACCOUNT_ID=local
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
R2_BUCKET_NAME=vocescribe-dev
# Override endpoint in r2.ts for local:
R2_ENDPOINT=http://localhost:9000
```

---

*Next: [08 — Background Jobs](08-background-jobs.md)*
