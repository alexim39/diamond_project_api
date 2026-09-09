import mongoose from 'mongoose';
import {
  CartModel, CommissionModel, CommissionPlanModel, PartnersModel, TransactionModel, runInTransaction,
} from './Billing.models.js';
import { DEFAULT_RATES } from '../domain/CommissionPlan.js';

const oid = (v) => String(v);
const objectId = (v) => new mongoose.Types.ObjectId(v);

/** Mongo implementation of the billing contracts. */
export class MongoCommissionLedger {
  async getActivePlan() {
    const existing = await CommissionPlanModel.findOne({ active: true }).lean();
    if (existing) return existing;
    return CommissionPlanModel.create({ name: 'Default Unilevel', rates: DEFAULT_RATES, active: true });
  }

  async findByCart(cartId) {
    return CommissionModel.find({ cartId }).lean();
  }

  async insertMany(entries) {
    if (entries.length === 0) return [];
    return CommissionModel.insertMany(entries, { ordered: false });
  }

  async findByEarner(partnerId, { limit = 50, skip = 0, status } = {}) {
    const filter = { earnerId: partnerId };
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      CommissionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CommissionModel.countDocuments(filter),
    ]);
    return { items: items.map((d) => ({ ...d, id: oid(d._id) })), total };
  }

  async sumByEarner(partnerId) {
    const rows = await CommissionModel.aggregate([
      { $match: { earnerId: objectId(partnerId) } },
      { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const out = { Pending: 0, Released: 0, Voided: 0, Reversed: 0, pendingCount: 0, releasedCount: 0 };
    for (const r of rows) {
      if (r._id in out) out[r._id] = Math.round(r.total * 100) / 100;
      if (r._id === 'Pending') out.pendingCount = r.count;
      if (r._id === 'Released') out.releasedCount = r.count;
    }
    out.lifetime = Math.round((out.Released) * 100) / 100;
    return out;
  }

  async pendingCarts({ limit = 25, skip = 0 } = {}) {
    const rows = await CommissionModel.aggregate([
      { $match: { status: 'Pending' } },
      { $group: { _id: '$cartId', total: { $sum: '$amount' }, count: { $sum: 1 }, latest: { $max: '$createdAt' }, buyerUsername: { $first: '$buyerUsername' }, buyerName: { $first: '$buyerName' } } },
      { $sort: { latest: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    const totalGroups = await CommissionModel.aggregate([
      { $match: { status: 'Pending' } },
      { $group: { _id: '$cartId' } },
      { $count: 'n' },
    ]);
    return {
      items: rows.map((r) => ({ cartId: oid(r._id), total: Math.round(r.total * 100) / 100, entries: r.count, buyerUsername: r.buyerUsername, buyerName: r.buyerName, latest: r.latest })),
      total: totalGroups[0]?.n ?? 0,
    };
  }

  async releaseCart(cartId, { releasedBy }) {
    return runInTransaction(async (session) => {
      const opt = session ? { session } : {};
      const pending = await CommissionModel.find({ cartId, status: 'Pending' }).setOptions(opt);
      let total = 0;
      for (const entry of pending) {
        entry.status = 'Released';
        entry.releasedBy = releasedBy;
        entry.releasedAt = new Date();
        await entry.save(opt);
        await PartnersModel.findByIdAndUpdate(entry.earnerId, { $inc: { balance: entry.amount } }, opt);
        await TransactionModel.create([{
          partnerId: entry.earnerId,
          amount: entry.amount,
          status: 'Completed',
          paymentMethod: 'Commission',
          transactionType: 'Credit',
          reference: `COMM-${oid(entry._id)}`,
        }], opt);
        total = Math.round((total + entry.amount) * 100) / 100;
      }
      return { released: pending.length, total };
    });
  }

  async voidCart(cartId, { releasedBy }) {
    return runInTransaction(async (session) => {
      const opt = session ? { session } : {};
      const entries = await CommissionModel.find({ cartId, status: { $in: ['Pending', 'Released'] } }).setOptions(opt);
      let voided = 0;
      let reversed = 0;
      for (const entry of entries) {
        if (entry.status === 'Pending') {
          entry.status = 'Voided';
          await entry.save(opt);
          voided += 1;
        } else {
          entry.status = 'Reversed';
          await entry.save(opt);
          await PartnersModel.findByIdAndUpdate(entry.earnerId, { $inc: { balance: -entry.amount } }, opt);
          await TransactionModel.create([{
            partnerId: entry.earnerId,
            amount: entry.amount,
            status: 'Completed',
            paymentMethod: 'Commission Clawback',
            transactionType: 'Debit',
            reference: `CLAW-${oid(entry._id)}`,
          }], opt);
          reversed += 1;
        }
      }
      return { voided, reversed, releasedBy };
    });
  }
}

export class MongoOrderReader {
  async findCart(cartId) {
    const cart = await CartModel.findById(cartId).lean();
    if (!cart) return null;
    const buyer = await PartnersModel.findById(cart.partner).select('username name surname').lean();
    return {
      id: oid(cart._id),
      buyerId: cart.partner ? oid(cart.partner) : null,
      buyerUsername: buyer?.username ?? '',
      buyerName: `${buyer?.name ?? ''} ${buyer?.surname ?? ''}`.trim(),
      total: cart.totalCost,
      status: cart.orderStatus ?? 'Pending',
    };
  }

  async markCart(cartId, status) {
    return CartModel.findByIdAndUpdate(cartId, { orderStatus: status }, { new: true }).lean();
  }

  async personalVolume(partnerId) {
    const rows = await CartModel.aggregate([
      { $match: { partner: objectId(partnerId), orderStatus: { $ne: 'Voided' } } },
      { $group: { _id: null, total: { $sum: '$totalCost' }, orders: { $sum: 1 } } },
    ]);
    return { total: rows[0]?.total ?? 0, orders: rows[0]?.orders ?? 0 };
  }

  async volumeFor(partnerIds) {
    if (partnerIds.length === 0) return { total: 0, orders: 0 };
    const ids = partnerIds.map(objectId);
    const rows = await CartModel.aggregate([
      { $match: { partner: { $in: ids }, orderStatus: { $ne: 'Voided' } } },
      { $group: { _id: null, total: { $sum: '$totalCost' }, orders: { $sum: 1 } } },
    ]);
    return { total: rows[0]?.total ?? 0, orders: rows[0]?.orders ?? 0 };
  }

  async recruitsSince(partnerId, since) {
    return PartnersModel.countDocuments({ partnerOf: partnerId, createdAt: { $gte: since } });
  }
}
