const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/users/search?email=
router.get('/search', auth, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email query required' });

  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email ILIKE $1 AND id != $2 LIMIT 5',
      [`%${email}%`, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
