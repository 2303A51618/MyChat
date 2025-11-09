import Audit from '../models/audit.model.js';

export const logEvent = async (event, actorId = null, targetId = null, meta = {}) => {
  try {
    // fire-and-forget
    Audit.create({ event, actor: actorId, target: targetId, meta }).catch(err => console.error('Audit log failed', err));
  } catch (err) {
    console.error('logEvent error', err);
  }
};
