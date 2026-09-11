import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ValidationException } from '../../../shared/domain/AppError.js';
import { ATTACHMENT_MIMES, MAX_ATTACHMENT_BYTES } from '../domain/Post.entity.js';

export const COMMUNITY_UPLOAD_DIR = path.join('src', 'uploads', 'community');
fs.mkdirSync(COMMUNITY_UPLOAD_DIR, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/** Exported for unit tests — rejects non-images with a domain error. */
export function communityFileFilter(_req, file, cb) {
  if (ATTACHMENT_MIMES.includes(file?.mimetype)) return cb(null, true);
  return cb(new ValidationException(`Only images are allowed (${ATTACHMENT_MIMES.join(', ')})`));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COMMUNITY_UPLOAD_DIR),
  // Extension comes from the verified mimetype, never the client filename.
  filename: (req, file, cb) => {
    const author = String(req.auth?.partnerId ?? 'anon').replace(/[^a-fA-F0-9]/g, '');
    cb(null, `community-${author || 'anon'}-${Date.now()}${EXT_BY_MIME[file.mimetype] ?? '.jpg'}`);
  },
});

/** Single-image upload: `image` field, 5MB cap. Multer size errors map to 400 in errorMiddleware. */
export const communityUpload = multer({
  storage,
  fileFilter: communityFileFilter,
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
});
