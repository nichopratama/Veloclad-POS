/**
 * RBAC — otorisasi berbasis role (Nicho-Brain D7).
 * Dipakai SETELAH authMiddleware (yang mengisi req.user dari JWT).
 *
 * Contoh: router.delete('/items/:id', requireRole('owner', 'admin'), handler)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user && req.user.role;
    if (!role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: role tidak diizinkan untuk aksi ini' });
    }
    next();
  };
};

module.exports = { requireRole };
