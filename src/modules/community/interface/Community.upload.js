import multer from 'multer';
import { ValidationException } from '../../../shared/domain/AppError.js';
import { ATTACHMENT_MIMES, MAX_ATTACHMENT_BYTES } from '../domain/Post.entity.js';

/**
 * Community images ride multer memory storage straight into the image
 * store (Cloudinary — same pattern as profile photos). Nothing touches
 * local disk, so uploads survive deploys and multi-server setups.
 * Kept export for compat — no longer a write target.
 */
export const COMMUNITY_UPLOAD_DIR = 'community';

/** Exported for unit tests — rejects non-images with a domain error. */
export function communityFileFilter(_req, file, cb) {
  if (ATTACHMENT_MIMES.includes(file?.mimetype)) return cb(null, true);
  return cb(new ValidationException(`Only images are allowed (${ATTACHMENT_MIMES.join(', ')})`));
}

/** Single-image upload: `image` field, 5MB cap. Multer size errors map to 400 in errorMiddleware. */
export const communityUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: communityFileFilter,
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
});
