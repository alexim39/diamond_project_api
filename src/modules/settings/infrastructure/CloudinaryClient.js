import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary image store (profile photos).
 * Credentials come from env at construction and are never logged —
 * only the folder/public-id (non-secrets) appear in errors. Uploads go
 * to `folder` with a server-generated public id (never the client
 * filename). Inject `sdk` in tests.
 */
export class ImageStore {
  async upload() { throw new Error('Not implemented'); }
}

export class CloudinaryImageStore extends ImageStore {
  /** @param {{cloudName, apiKey, apiSecret, folder, sdk?}} config */
  constructor(config = {}) {
    super();
    this.folder = config.folder || 'diamond-projects';
    this.sdk = config.sdk ?? cloudinary;
    if (!config.sdk) {
      this.sdk.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: true,
      });
    }
  }

  async upload(buffer, { publicId } = {}) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Empty image upload');
    const sdk = this.sdk;
    return new Promise((resolve, reject) => {
      const stream = sdk.uploader.upload_stream(
        { folder: this.folder, public_id: publicId, resource_type: 'image' },
        (error, result) => {
          if (error) return reject(new Error(`Image upload failed: ${error?.message ?? 'unknown error'}`));
          if (!result?.secure_url) return reject(new Error('Image upload returned no URL'));
          resolve({ url: result.secure_url, publicId: result.public_id ?? null });
        },
      );
      stream.end(buffer);
    });
  }
}

export class DisabledImageStore extends ImageStore {
  async upload() {
    const error = new Error('Profile photo uploads are not configured yet');
    error.statusCode = 503;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }
}

/** Factory — real store only when all three credentials exist. */
export const buildImageStore = (cloudinaryEnv = {}) => (
  cloudinaryEnv.enabled
    ? new CloudinaryImageStore(cloudinaryEnv)
    : new DisabledImageStore()
);
