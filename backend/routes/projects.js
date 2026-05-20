const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Helper: check if user is admin of a project
const isProjectAdmin = async (projectId, userId) => {
  const result = await pool.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows[0]?.role === 'admin';
};

// Helper: check if user is member of a project
const isProjectMember = async (projectId, userId) => {
  const result = await pool.query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows.length > 0;
};

// GET /api/projects - get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pm.role, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      JOIN users u ON p.owner_id = u.id
      WHERE pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects - create project
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const proj = await client.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', req.user.id]
    );
    // Creator is auto-admin
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [proj.rows[0].id, req.user.id, 'admin']
    );
    await client.query('COMMIT');
    res.status(201).json({ ...proj.rows[0], role: 'admin' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
});

// GET /api/projects/:id - get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const member = await isProjectMember(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const proj = await pool.query(`
      SELECT p.*, pm.role, u.name as owner_name
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      JOIN users u ON p.owner_id = u.id
      WHERE p.id = $2
    `, [req.user.id, req.params.id]);

    const members = await pool.query(`
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `, [req.params.id]);

    res.json({ ...proj.rows[0], members: members.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/projects/:id - update project (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required' });

    const { name, description } = req.body;
    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/projects/:id - delete project (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required' });

    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:id/members - add member (admin only)
router.post('/:id/members', auth, [
  body('email').isEmail()
], async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required' });

    const { email, role = 'member' } = req.body;
    const user = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const existing = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, user.rows[0].id]
    );
    if (existing.rows.length > 0) return res.status(400).json({ message: 'User already a member' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [req.params.id, user.rows[0].id, role]
    );
    res.status(201).json({ message: 'Member added', user: user.rows[0], role });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId - remove member (admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required' });

    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id/members/:userId/role - change role (admin only)
router.put('/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const admin = await isProjectAdmin(req.params.id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required' });

    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

    await pool.query(
      'UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3',
      [role, req.params.id, req.params.userId]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
