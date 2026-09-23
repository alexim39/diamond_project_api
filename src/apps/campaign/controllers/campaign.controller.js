import {CampaignModel} from './../models/campaign.model.js';
import { PartnersModel } from './../../partner/models/partner.model.js';
import mongoose from 'mongoose';
import {TransactionModel} from '../../transaction/models/transaction.model.js';
import { NotifyUseCase } from '../../../modules/notifications/application/NotificationsCenter.usecases.js';
import { MongoStoredNotificationStore } from '../../../modules/notifications/infrastructure/StoredNotifications.mongo.repository.js';
import { recordAudit } from '../../../modules/audit/index.js';
import { sendEmail } from '../../../services/emailService.js';
import { buildProspectAccess } from '../../../modules/crm/application/Prospect.access.js';

// Session + ownership guard (campaigns hold wallet money — createdBy must be
// the session; reads are owner/upline/admin). Visits stay public (the
// :4201 site records them for anonymous visitors).
const guard = buildProspectAccess({
  findProspectById: async () => null,
  findPartnerById: (id) => PartnersModel.findById(id).select('role email partnerOf').lean().catch(() => null),
});
const sessionId = (req) => (req.auth?.partnerId ? String(req.auth.partnerId) : null);
const deny = (res, err) => res.status(err?.statusCode ?? 403).json({ message: err?.message ?? 'Forbidden', success: false });

/** Force wallet + record ownership to the session (blocks draining others). */
const ownBody = (req) => {
  if (req.body && typeof req.body === 'object') req.body.createdBy = sessionId(req);
};

const ADMIN_STATUSES = ['Pending', 'Active', 'Rejected', 'Ended'];
const ALLOWED_TRANSITIONS = {
  Pending: ['Active', 'Rejected'],
  Active: ['Ended'],
  Rejected: [],
  Ended: [],
};

/** Best-effort partner notice (in-app row + email) — never fails the transition. */
const notifyOwner = async (ownerId, { title, body, campaignId, status }) => {
  try {
    const stored = new MongoStoredNotificationStore();
    const notify = new NotifyUseCase({ stored });
    await notify.execute({
      recipientId: String(ownerId),
      category: 'marketing',
      priority: status === 'Rejected' ? 'high' : 'medium',
      title,
      body,
      icon: 'campaign',
      link: '/dashboard/tools/campaigns/manage',
      key: `campaign:${campaignId}:${status}`,
    }).catch(() => null);
    const owner = await PartnersModel.findById(ownerId).select('email name surname username').lean().catch(() => null);
    if (owner?.email) {
      await sendEmail(owner.email, title, `<p>${body}</p>`).catch(() => null);
    }
  } catch { /* notifications never fail admin actions */ }
};

/** Per-channel minimum holds — mirrors the legacy per-channel endpoints. */
const CHANNEL_MINIMUM = {
  facebook: 6500,
  youtube: 18000,
  linkedin: 10500,
};

const CHANNEL_LABEL = {
  facebook: 'Facebook',
  youtube: 'Youtube',
  linkedin: 'LinkedIn',
};

// Unified campaign creation (one wizard for all channels).
// Same economics as the legacy per-channel endpoints (minimum hold per
// channel, full-budget wallet debit, Pending admin flow); those endpoints
// stay mounted untouched for old clients.
export const createCampaign = async (req, res) => {
  try {
    const { body } = req;
    ownBody(req);
    const channel = String(body.channel ?? '').toLowerCase();

    if (!CHANNEL_MINIMUM[channel]) {
      return res.status(400).json({
        message: 'Pick a valid channel: Facebook, YouTube or LinkedIn.',
        success: false,
      });
    }

    const partner = await PartnersModel.findById(body.createdBy);
    if (!partner) {
      return res.status(400).json({
        message: 'Partner not found',
        success: false,
      });
    }

    const budgetAmount = Number(body.budget?.budgetAmount);
    if (!Number.isFinite(budgetAmount)) {
      return res.status(400).json({
        message: 'Enter a valid budget amount.',
        success: false,
      });
    }

    // Explicit location targets back the scope for the admin record.
    const locationTargets = Array.isArray(body.targetAudience?.locationTargets)
      ? [...new Set(body.targetAudience.locationTargets.map((t) => String(t ?? '').trim()).filter(Boolean))].slice(0, 100)
      : [];
    const locationScope = String(body.targetAudience?.locationTarget ?? '');
    if ((locationScope === 'States' || locationScope === 'Countries') && locationTargets.length === 0) {
      return res.status(400).json({
        message: 'Pick at least one target state or country for the admin team.',
        success: false,
      });
    }

    // Check if the partner entered sufficient amount
    if (budgetAmount < CHANNEL_MINIMUM[channel]) {
      return res.status(402).json({
        message: `Minimum budget for ${CHANNEL_LABEL[channel]} is ₦${CHANNEL_MINIMUM[channel].toLocaleString()}.`,
        success: false,
      });
    }

    // Check if the partner has sufficient balance for the budget amount
    if (partner.balance >= budgetAmount) {
      // Deduct the budget amount from the partner's balance
      partner.balance -= budgetAmount;

      // Save the updated partner balance
      await partner.save();

      // Record the transaction
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: budgetAmount,  // Use the budget amount as the charge
        status: 'Completed',
        paymentMethod: `${CHANNEL_LABEL[channel]} Ads`,
        transactionType: 'Debit',
        reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
      });

      await transaction.save();

      const title = String(body.title ?? '').trim().slice(0, 120);
      // Create a new Ad document using the data from the request body
      const newAd = new CampaignModel({
        ...body,
        budget: { ...body.budget, budgetAmount },
        targetAudience: { ...body.targetAudience, locationTargets },
        campaignName: title ? `${title} · ${CHANNEL_LABEL[channel]}` : CHANNEL_LABEL[channel],
      });

      // Save the Ad document to the database
      await newAd.save();

      res.status(200).json({
        message: 'Ad campaign created successfully! Our admin team will run it and leads will land in your general contact list.',
        data: newAd,
        transaction: transaction,
        success: true,
      });

    } else {
      return res.status(401).json({
        message: 'Insufficient balance for transaction',
        success: false,
      });
    }

  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: 'Error creating campaign',
      success: false,
    });
  }
};

// facebook campaign/ads
export const createFacebookCampaign = async (req, res) => {
  const MIN_CHARGE = 6500; // Define the Facebook minimum charge amount  

  try {
    const { body } = req;
    ownBody(req);

    // Find the partner by ID  
    const partner = await PartnersModel.findById(body.createdBy);
    if (!partner) {
      return res.status(400).json({
        message: 'Partner not found',
        success: false,
      });
    }

    // Check if the partner entered sufficient amount  
    if (body.budget.budgetAmount < MIN_CHARGE) {
      return res.status(402).json({
        message: 'Insufficient amount for transaction',
        success: false,
      });
    }

    // Check if the partner has sufficient balance for the budget amount
    if (partner.balance >= body.budget.budgetAmount) {
      // Deduct the budget amount from the partner's balance  
      partner.balance -= body.budget.budgetAmount;

      // Save the updated partner balance  
      await partner.save();

      // Record the transaction  
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: body.budget.budgetAmount,  // Use the budget amount as the charge
        status: 'Completed',
        paymentMethod: 'Facebook Ads',
        transactionType: 'Debit',
        reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
      });

      await transaction.save();

      // Create a new Ad document using the data from the request body
      const newAd = new CampaignModel(body);

      // Save the Ad document to the database
      await newAd.save();

      res.status(200).json({
        message: 'Ad campaign created successfully!',
        data: newAd,
        transaction: transaction,
        success: true,
      });

    } else {
      return res.status(401).json({
        message: 'Insufficient balance for transaction',
        success: false,
      });
    }

  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: 'Error creating Facebook campaign',
      success: false,
    });
  }
}


// youtube campaign
export const createYoutubeCampaign = async (req, res) => {
  const MIN_CHARGE = 18000; // Define the Youtube minimum charge amount  

  try {

      const { body } = req; 
      ownBody(req);

      // Find the partner by ID  
      const partner = await PartnersModel.findById(body.createdBy);
      if (!partner) {
        return res.status(400).json({
          message: 'Partner not found',
          success: false,
        });
      }

      // Check if the partner entered sufficient amount  
      if (body.budget.budgetAmount < MIN_CHARGE) {
        return res.status(402).json({
          message: 'Insufficient amount for transaction',
          success: false,
        });
      }

      // Check if the partner has sufficient balance for the budget amount
      if (partner.balance >= body.budget.budgetAmount) {
        // Deduct the budget amount from the partner's balance  
        partner.balance -= body.budget.budgetAmount;

        // Save the updated partner balance  
        await partner.save();

        // Record the transaction  
        const transaction = new TransactionModel({
          partnerId: partner._id,
          amount: body.budget.budgetAmount,  // Use the budget amount as the charge
          status: 'Completed',
          paymentMethod: 'Youtube Ads',
          transactionType: 'Debit',
          reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
        });

        await transaction.save();

        // Create a new Ad document using the data from the request body
         const newAd = new CampaignModel(body);

        // Save the Ad document to the database
        await newAd.save();

        res.status(200).json({
            message: 'Ad campaign created successfully!',
            data: newAd, // Include the saved Ad data in the response
            transaction: transaction,
            success: true,
        });

      } else {
        return res.status(401).json({
          message: 'Insufficient balance for transaction',
          success: false,
        });
      }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating Youtube campaign',
            error: error.message
        })
    }
}

// linkedin campaign
export const createLinkedinCampaign = async (req, res) => {
  const MIN_CHARGE = 10500; // Define the LinkedIn minimum charge amount  

    try {

      const { body } = req; 
      ownBody(req);

        // Find the partner by ID  
      const partner = await PartnersModel.findById(body.createdBy);
      if (!partner) {
        return res.status(400).json({
          message: 'Partner not found',
          success: false,
        });
      }

      // Check if the partner entered sufficient amount  
      if (body.budget.budgetAmount < MIN_CHARGE) {
        return res.status(400).json({
          message: 'Insufficient amount for transaction',
          success: false,
        });
      }

      // Check if the partner has sufficient balance for the budget amount
      if (partner.balance >= body.budget.budgetAmount) {
      // Deduct the budget amount from the partner's balance  
      partner.balance -= body.budget.budgetAmount;

      // Save the updated partner balance  
      await partner.save();

      // Record the transaction  
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: body.budget.budgetAmount,  // Use the budget amount as the charge
        status: 'Completed',
        paymentMethod: 'LinkedIn Ads',
        transactionType: 'Debit',
        reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
      });

      await transaction.save();

      // Create a new Ad document using the data from the request body
        const newAd = new CampaignModel(body);

      // Save the Ad document to the database
      await newAd.save();

      res.status(200).json({
          message: 'Ad campaign created successfully!',
          data: newAd, // Include the saved Ad data in the response
          transaction: transaction,
          success: false,
      });

      } else {
        return res.status(401).json({
          message: 'Insufficient balance for transaction',
          success: false,
        });
      }

    } catch (error) {
        res.status(500).json({
            errpr: error.message,
            success: false,
            message: 'Error creating LinkedIn campaign'
        })
    }
}

// Route handler to fetch all Ads by createdBy — owner, upline or admin.
export const getCampaignsCreatedBy = async (req, res) => {
    try {
      const { createdBy } = req.params; // Assuming createdBy is passed as a query parameter

      try {
        await guard.requireListAccess(sessionId(req), createdBy);
      } catch (err) {
        return deny(res, err);
      }
  
      // Find Ads where createdBy matches the provided ID
      const ads = await CampaignModel.find({ createdBy });
  
      res.status(200).json({
        message: 'Ads retrieved successfully!',
        data: ads,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error retrieving Ads',
        error: error.message,
        success: false,
      });
    }
};




export const recordVisits = async (req, res) => {
  try {
    const { username, channel } = req.body;

    // Input validation
    if (!username) {
      return res.status(400).json({ message: 'Username is required', success: false });
    }

    // Step 1: Find the partner's ObjectId by username
    const partner = await PartnersModel.findOne({ username });
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found', success: false });
    }

    // Step 2: Handle the channel
    if (!channel || channel === 'unknown' || !mongoose.Types.ObjectId.isValid(channel)) {
      // If channel is not provided or not a valid ObjectId, increment visits in the PartnersModel
      const updatedPartner = await PartnersModel.findOneAndUpdate(
        { _id: partner._id },
        { $inc: { visits: 1 } },
        { new: true }
      );

      if (updatedPartner) {
        return res.status(200).json({
          message: 'Partner visit recorded successfully',
          success: true,
          data: { visits: updatedPartner.visits ?? null },
        });
      } else {
        // This should ideally not happen if the partner was found, but handle defensively
        return res.status(500).json({
          message: 'Error updating partner visits',
          success: false,
        });
      }
    } else {
      // Step 3: Check if the channel exists in the CampaignModel and belongs to the partner
      const updatedCampaign = await CampaignModel.findOneAndUpdate(
        { _id: channel, createdBy: partner._id },
        { $inc: { visits: 1 } },
        { new: true }
      );

      if (updatedCampaign) {
        return res.status(200).json({
          message: 'Campaign visit recorded successfully',
          success: true,
          campaign: updatedCampaign,
        });
      } else {
        // If campaign does not exist, increment visits in the PartnersModel
        const updatedPartner = await PartnersModel.findOneAndUpdate(
          { _id: partner._id },
          { $inc: { visits: 1 } },
          { new: true }
        );
        return res.status(200).json({
          message: 'Partner visit recorded successfully',
          success: true,
          data: { visits: updatedPartner.visits ?? null },
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: 'Failed to record visit',
      success: false,
    });
  }
}

// Admin queue: every campaign by status, oldest first (default Pending).
// Paginated — the queue must stay fast no matter how many partners submit.
export const listCampaignsForAdmin = async (req, res) => {
  try {
    const status = req.query.status ?? 'Pending';
    if (!ADMIN_STATUSES.includes(status) && status !== 'All') {
      return res.status(400).json({ message: 'Invalid status filter', success: false });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const filter = status === 'All' ? {} : { deliveryStatus: status };
    const [rows, total] = await Promise.all([
      CampaignModel.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
      CampaignModel.countDocuments(filter),
    ]);
    const ownerIds = [...new Set(rows.map((r) => String(r.createdBy)).filter(Boolean))];
    const owners = ownerIds.length > 0
      ? await PartnersModel.find({ _id: { $in: ownerIds } }).select('username name surname email phone').lean().catch(() => [])
      : [];
    const labels = Object.fromEntries((owners ?? []).map((o) => [String(o._id), {
      username: o.username,
      name: [o.name, o.surname].filter(Boolean).join(' ') || o.username,
      email: o.email ?? null,
      phone: o.phone ?? null,
    }]));
    res.status(200).json({
      message: 'Campaigns retrieved successfully!',
      data: rows.map((r) => ({ ...r, owner: labels[String(r.createdBy)] ?? null })),
      meta: { total, limit, skip },
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving campaigns', error: error.message, success: false });
  }
};

// Admin transition: Pending→Active/Rejected, Active→Ended. Reject refunds
// the held budget (credit mirroring the debit) so money never strands.
export const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body ?? {};
    if (!ADMIN_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status', success: false });
    }
    const campaign = await CampaignModel.findById(id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found', success: false });
    }
    const from = campaign.deliveryStatus ?? 'Pending';
    if (!(ALLOWED_TRANSITIONS[from] ?? []).includes(status)) {
      return res.status(409).json({
        message: `Cannot move campaign from ${from} to ${status}`,
        success: false,
      });
    }
    campaign.deliveryStatus = status;
    await campaign.save();

    if (status === 'Rejected') {
      // Refund the held budget in full.
      const owner = await PartnersModel.findById(campaign.createdBy);
      if (owner) {
        const amount = Number(campaign.budget?.budgetAmount ?? 0);
        if (amount > 0) {
          owner.balance = Number(owner.balance ?? 0) + amount;
          await owner.save();
          await TransactionModel.create({
            partnerId: owner._id,
            amount,
            status: 'Completed',
            paymentMethod: 'Campaign Refund',
            transactionType: 'Credit',
            reference: Math.floor(100000000 + Math.random() * 900000000).toString(),
          });
        }
      }
    }

    const title = status === 'Active'
      ? 'Your ad campaign is live'
      : status === 'Rejected'
        ? 'Your ad campaign was not approved'
        : 'Your ad campaign has ended';
    const body = status === 'Rejected' && reason
      ? `"${campaign.campaignName}": ${String(reason).slice(0, 500)} Your held budget was refunded in full.`
      : status === 'Rejected'
        ? `"${campaign.campaignName}" was not approved. Your held budget was refunded in full.`
        : status === 'Active'
          ? `"${campaign.campaignName}" is now running. Leads will land in your general contact list.`
          : `"${campaign.campaignName}" has ended. See what it earned under Marketing → What campaigns earned.`;
    await notifyOwner(campaign.createdBy, { title, body, campaignId: String(campaign._id), status });

    res.status(200).json({ message: `Campaign ${status.toLowerCase()} successfully!`, data: campaign, success: true });
    void recordAudit({
      actorId: req.auth?.partnerId, action: 'campaign.decide',
      targetType: 'campaign', targetId: String(campaign._id),
      detail: { from, to: status, name: campaign.campaignName ?? null },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating campaign', error: error.message, success: false });
  }
};

// Get a single campaign  
export const getCampaign = async (req, res) => {  
  try {  
    const { id } = req.params; // Assuming id is passed as a route parameter 

    // Find the campaign where id matches the provided ID  
    const campaign = await CampaignModel.findById(id);  

    if (!campaign) {  
      return res.status(400).json({  
        message: 'Campaign not found',  
        success: false,
      });  
    }

    // Campaigns hold wallet money — owner, upline or admin only.
    try {
      await guard.requireListAccess(sessionId(req), campaign.createdBy);
    } catch (err) {
      return deny(res, err);
    }
  
    res.status(200).json({  
      message: 'Campaign retrieved successfully!',  
      data: campaign,  
      success: true,
    });  
  } catch (error) {  
    res.status(500).json({  
      message: 'Error retrieving the campaign',  
      error: error.message,  
      success: false,
    });  
  }  
};
