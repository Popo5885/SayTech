import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { inferMediaTypeFromMimeType } from "@lottery/core/templates";
import { auth } from "../../../../auth";
import { clientIp, rateLimit, rateLimitResponse } from "../../../../lib/rate-limit";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// SECURITY: allowlist of MIME types we accept, paired with the canonical
// extension we will use on disk and the magic-byte signatures we expect.
// Files served from /public render in-origin, so we must not allow arbitrary
// extensions (e.g. .html / .svg with embedded scripts) that could lead to XSS.
type AllowedMime = {
  ext: string;
  signatures: Array<{ offset: number; bytes: number[] }>;
};

const ALLOWED: Record<string, AllowedMime> = {
  "image/png": { ext: ".png", signatures: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }] },
  "image/jpeg": { ext: ".jpg", signatures: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  "image/webp": {
    ext: ".webp",
    signatures: [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }]
  },
  "image/gif": {
    ext: ".gif",
    signatures: [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }]
  },
  "video/mp4": { ext: ".mp4", signatures: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }] }
};

function magicMatches(buffer: Buffer, mime: string): boolean {
  const spec = ALLOWED[mime];
  if (!spec) return false;
  return spec.signatures.some((sig) =>
    sig.bytes.every((byte, idx) => buffer[sig.offset + idx] === byte)
  );
}

function sanitizeBaseName(filename: string): string {
  return filename.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 60);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // SECURITY: per-user upload rate-limit (10 uploads / minute) plus per-IP
  // backstop to slow shared-account abuse.
  const userId = (session.user as { id?: string }).id ?? session.user.email ?? "anon";
  const ip = clientIp(request);
  const userLimit = rateLimit({ key: `upload:user:${userId}`, limit: 10, windowMs: 60_000 });
  const ipLimit = rateLimit({ key: `upload:ip:${ip}`, limit: 30, windowMs: 60_000 });
  const tooMany = rateLimitResponse(userLimit) ?? rateLimitResponse(ipLimit);
  if (tooMany) return tooMany;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
  }

  const declaredType = (file.type || "").toLowerCase();
  const mediaType = inferMediaTypeFromMimeType(declaredType);

  if (!mediaType || !ALLOWED[declaredType]) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WEBP, GIF, or MP4 uploads are supported." },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum size is 25MB." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // SECURITY: sniff the actual file bytes — never trust the client-supplied MIME.
  if (!magicMatches(bytes, declaredType)) {
    return NextResponse.json(
      { error: "File contents do not match the declared type." },
      { status: 400 }
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "templates");
  // SECURITY: force extension from the validated MIME (not from the user-supplied
  // filename). Prevents .html / .svg / .js stored-XSS via uploads.
  const extension = ALLOWED[declaredType].ext;
  const baseName =
    sanitizeBaseName(path.basename(file.name, path.extname(file.name))) || "upload";
  const filename = `${Date.now()}-${baseName}${extension}`;
  const absolutePath = path.join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(absolutePath, bytes);

  return NextResponse.json({
    mediaType,
    url: new URL(`/uploads/templates/${filename}`, request.url).toString()
  });
}
