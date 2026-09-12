import { ConflictException, NotFoundException } from '../../../shared/domain/AppError.js';
import { createProspectEntity, normalizePhone } from '../domain/Prospect.entity.js';
import { createStatusOverlay } from '../domain/Prospect.entity.js';

/** POST /v1/prospects — scoped dup-check (legacy: global). */
export class CreateProspectUseCase {
  /** @param {{prospects, campaigns?}} deps (campaigns verifies attribution ownership) */
  constructor({ prospects, campaigns }) {
    Object.assign(this, { prospects, campaigns: campaigns ?? null });
  }
  async execute(input) {
    const entity = createProspectEntity(input);
    if (entity.campaignId) {
      // 404 for both missing and foreign campaigns — no existence oracle.
      const owned = await this.campaigns?.findOwned(entity.campaignId, entity.partnerId);
      if (!owned) throw new NotFoundException('Campaign not found');
    }
    const dupePhone = entity.prospectPhone
      ? await this.prospects.findDuplicate(entity.partnerId, { phone: entity.prospectPhone, email: null })
      : null;
    if (dupePhone) {
      const name = `${dupePhone.prospectName ?? ''} ${dupePhone.prospectSurname ?? ''}`.trim() || 'Existing contact';
      throw new ConflictException(`You already have a contact with this phone number: ${name} (${dupePhone.prospectPhone}).`);
    }
    const dupeEmail = entity.prospectEmail
      ? await this.prospects.findDuplicate(entity.partnerId, { phone: null, email: entity.prospectEmail })
      : null;
    if (dupeEmail) {
      const name = `${dupeEmail.prospectName ?? ''} ${dupeEmail.prospectSurname ?? ''}`.trim() || 'Existing contact';
      throw new ConflictException(`You already have a contact with this email address: ${name} (${dupeEmail.prospectEmail}).`);
    }
    try {
      return await this.prospects.create(entity);
    } catch (error) {
      if (error?.code === 11000) {
        const msg = String(error?.message ?? '').toLowerCase();
        if (msg.includes('prospectemail')) throw new ConflictException('You already have a contact with this email address.');
        throw new ConflictException('You already have a contact with this phone number.');
      }
      throw error;
    }
  }
}

/**
 * PUT /v1/prospects/:id — legacy wrote `body._prospectSourceid`
 * (always undefined → wiped prospectSource) and a phantom `prospectRemark`.
 * New: explicit field map, undefined keys never touch the document.
 * Scoped duplicate check prevents only your own phone/email collision;
 * cross-partner same phone is allowed (compound index enforces the scope).
 */
export class UpdateProspectUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) { this.prospects = prospects; }
  async execute({ prospectId, ...fields }) {
    const patch = {};
    for (const key of [
      'prospectName', 'prospectSurname', 'prospectPhone', 'prospectEmail', 'prospectSource',
      'relationship', 'priority', 'bestTimeToCall', 'consentToContact', 'notes',
    ]) {
      if (fields[key] !== undefined) patch[key] = fields[key];
    }
    if (patch.prospectPhone) patch.prospectPhone = normalizePhone(patch.prospectPhone);
    if (patch.prospectPhone || patch.prospectEmail) {
      const existing = await this.prospects.findById(prospectId);
      if (!existing) throw new NotFoundException('Prospect not found');
      const nextPhone = patch.prospectPhone ?? existing.prospectPhone;
      const nextEmail = patch.prospectEmail ?? existing.prospectEmail;
      if (nextPhone) {
        const dupe = await this.prospects.findDuplicate(existing.partnerId, { phone: nextPhone, email: null });
        if (dupe && String(dupe.id ?? dupe._id) !== String(prospectId)) {
          throw new ConflictException('You already have a contact with this phone number.');
        }
      }
      if (nextEmail) {
        const dupe = await this.prospects.findDuplicate(existing.partnerId, { phone: null, email: nextEmail });
        if (dupe && String(dupe.id ?? dupe._id) !== String(prospectId)) {
          throw new ConflictException('You already have a contact with this email address.');
        }
      }
    }
    try {
      const updated = await this.prospects.updateFields(prospectId, patch);
      if (!updated) throw new NotFoundException('Prospect not found');
      return updated;
    } catch (error) {
      if (error?.code === 11000) throw new ConflictException('You already have a contact with this phone number.');
      throw error;
    }
  }
}

/** POST /v1/prospects/:id/status — overlay merge, never whole-subdoc replace. */
export class UpdateProspectStatusUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) { this.prospects = prospects; }
  async execute({ prospectId, status }) {
    const overlay = createStatusOverlay(status);
    const updated = await this.prospects.updateStatus(prospectId, overlay);
    if (!updated) throw new NotFoundException('Prospect not found');
    return updated;
  }
}

/** DELETE /v1/prospects/:id */
export class DeleteProspectUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) { this.prospects = prospects; }
  async execute({ prospectId }) {
    const deleted = await this.prospects.deleteById(prospectId);
    if (!deleted) throw new NotFoundException('Prospect not found');
    return { deleted: true };
  }
}
