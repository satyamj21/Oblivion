const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Demo users (replace with DB in production)
const DEMO_USERS = [
  { id: '1', email: 'admin@zombieguard.bank', password: '$2a$10$XpJGBfmRQ1APDQ8J3CjV2OS5GxN3eFv.0GnQMXLaOVJdVnJgdkKMe', role: 'admin', name: 'Security Admin' },
  { id: '2', email: 'dev@zombieguard.bank', password: '$2a$10$XpJGBfmRQ1APDQ8J3CjV2OS5GxN3eFv.0GnQMXLaOVJdVnJgdkKMe', role: 'developer', name: 'DevOps Engineer' }
];
// Default password for both: "demo1234"

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = DEMO_USERS.find(u => u.email === email);

  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'zombieguard-dev-secret',
    { expiresIn: '24h' }
  );

  res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

module.exports = router;
