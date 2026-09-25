function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
  };
}

module.exports = { requireRole };
