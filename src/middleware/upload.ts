import { Request, Response, NextFunction } from 'express';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadedFile {
  data: Buffer;
  mimeType: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    uploadedFile?: UploadedFile;
  }
}

/**
 * Accepts a base64 image in req.body.image (data URI or raw base64).
 * Validates MIME type (jpeg/png/webp) and size (≤5 MB).
 * Attaches { data, mimeType } to req.uploadedFile.
 */
export function validateUpload(req: Request, res: Response, next: NextFunction): void {
  const raw: unknown = (req.body as Record<string, unknown>).image;
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'image field is required (base64 string or data URI)' });
    return;
  }

  let mimeType: string;
  let base64Data: string;

  if (raw.startsWith('data:')) {
    const match = raw.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Invalid data URI format' });
      return;
    }
    mimeType = match[1];
    base64Data = match[2];
  } else {
    // Detect MIME from magic bytes after decoding first few bytes
    const probe = Buffer.from(raw.slice(0, 12), 'base64');
    if (probe[0] === 0xff && probe[1] === 0xd8) {
      mimeType = 'image/jpeg';
    } else if (probe[0] === 0x89 && probe[1] === 0x50 && probe[2] === 0x4e && probe[3] === 0x47) {
      mimeType = 'image/png';
    } else if (probe.toString('ascii', 0, 4) === 'RIFF' && probe.toString('ascii', 8, 12) === 'WEBP') {
      mimeType = 'image/webp';
    } else {
      res.status(400).json({ error: 'Could not detect image type. Provide a data URI instead.' });
      return;
    }
    base64Data = raw;
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    res.status(400).json({ error: `Unsupported image type: ${mimeType}. Allowed: jpeg, png, webp` });
    return;
  }

  const data = Buffer.from(base64Data, 'base64');
  if (data.length > MAX_BYTES) {
    res.status(400).json({ error: `Image exceeds 5 MB limit (${(data.length / 1024 / 1024).toFixed(1)} MB)` });
    return;
  }

  req.uploadedFile = { data, mimeType };
  next();
}
