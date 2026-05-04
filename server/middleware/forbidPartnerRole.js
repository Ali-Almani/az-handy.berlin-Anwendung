import User from '../models/User.js';
import { resolveAuthUserId } from '../utils/normalizeUserId.js';

/** Rolle Partner: nur öffentliche Formular-Center GETs ohne Token; geschützte APIs sonst gesperrt. */
export async function forbidPartnerRole(req, res, next) {
  try {
    let role = String(req.user?.role ?? '').trim();
    if (!role && req.user != null) {
      const uid = resolveAuthUserId(req.user);
      if (uid != null) {
        const dbUser = await User.findByPk(uid);
        role = String(dbUser?.role ?? dbUser?.get?.('role') ?? '').trim();
      }
    }
    if (role === 'Partner') {
      return res.status(403).json({
        success: false,
        message: 'Für die Rolle Partner ist nur das Formular Center freigeschaltet.'
      });
    }
    next();
  } catch (e) {
    next(e);
  }
}
