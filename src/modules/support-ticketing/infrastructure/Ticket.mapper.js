/**
 * Data Mapper: Mongoose doc <-> pure Domain object.
 * Keeps ObjectId / Date conversions in ONE place.
 */
export const TicketMapper = {
  /** @param {any} doc Mongoose doc or lean object */
  toDomain(doc) {
    const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    return {
      id: String(o._id),
      subject: o.subject,
      description: o.description,
      date: o.date instanceof Date ? o.date : new Date(o.date),
      category: o.category,
      priority: o.priority,
      comment: o.comment ?? '',
      partnerId: String(o.partnerId),
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  },

  /** @param {{subject:string,description:string,date:Date,category:string,priority:string,comment:string,partnerId:string}} entity */
  toPersistence(entity) {
    return {
      subject: entity.subject,
      description: entity.description,
      date: entity.date,
      category: entity.category,
      priority: entity.priority,
      comment: entity.comment ?? '',
      partnerId: entity.partnerId,
    };
  },
};
