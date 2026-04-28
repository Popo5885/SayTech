import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { inferMediaTypeFromMimeType } from "@lottery/core/templates";
import { auth } from "../../../../auth";

export const runtime = "nodejs";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function sanitizeBaseName(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, "-");
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
  }

  const mediaType = inferMediaTypeFromMimeType(file.type);

  if (!mediaType) {
    return NextResponse.json(
      { error: "Only image and video uploads are supported." },
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
  const uploadDir = path.join(process.cwd(), "public", "uploads", "templates");
  const extension = path.extname(file.name) || (mediaType === "IMAGE" ? ".png" : ".mp4");
  const baseName = sanitizeBaseName(path.basename(file.name, path.extname(file.name)));
  const filename = `${Date.now()}-${baseName}${extension}`;
  const absolutePath = path.join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(absolutePath, bytes);

  return NextResponse.json({
    mediaType,
    url: new URL(`/uploads/templates/${filename}`, request.url).toString()
  });
}
