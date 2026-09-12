import { NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';

/**
 * Profile photo upload: Cloudinary → partner.profileImage URL.
 * Session identity owns the write — no :userId to tamper with (legacy
 * trusted a URL param, so anyone could overwrite anyone's photo).
 */
export class UploadProfileImageUseCase {
  /** @param {{images, partners}} deps */
  constructor({ images, partners }) {
    Object.assign(this, { images, partners });
  }

  async execute({ partnerId, buffer }) {
    if (!buffer || buffer.length === 0) throw new ValidationException('No image uploaded');
    const exists = await this.partners.findById(partnerId);
    if (!exists) throw new NotFoundException('Partner not found');
    const safeId = String(partnerId).replace(/[^a-fA-F0-9]/g, '');
    const { url } = await this.images.upload(buffer, {
      publicId: `partner-${safeId || 'anon'}-${Date.now()}`,
    });
    await this.partners.updateById(partnerId, { profileImage: url });
    return { url };
  }
}
