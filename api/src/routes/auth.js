const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (knexConfig) => {
  const environment = process.env.NODE_ENV || 'development';
  const knex = require('knex')(knexConfig[environment]);

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      // search_path di-set di level pool (knexfile afterCreate); query langsung di schema tenant.
      const user = await knex('users').where({ email }).first();

      if (!user) {
        return res.status(401).json({ error: 'Email atau password salah' });
      }

      // Verifikasi password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Email atau password salah' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tenantId: process.env.TENANT_ID },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
