const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const isProjectMember = async (projectId, userId) => {
  const result = await pool.query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows.length > 0;
};

const isProjectAdmin = async (projectId, userId) => {
  const result = await pool.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows[0]?.role === 'admin';
};

// GET /api/tasks/dashboard - dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE t.assigned_to = $1) as my_tasks,
        COUNT(*) FILTER (WHERE t.assigned_to = $1 AND t.status = 'todo') as todo,
        COUNT(*) FILTER (WHERE t.assigned_to = $1 AND t.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE t.assigned_to = $1 AND t.status = 'done') as done,
        COUNT(*) FILTER (WHERE t.assigned_to = $1 AND t.due_date < NOW() AND t.status != 'done') as overdue
      FROM tasks t
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $1
    `, [req.user.id]);

    const recent = await pool.query(`
      SELECT t.*, p.name as project_name, u.name as assigned_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $1
      LEFT JOIN users u ON t.assigned_to = u.id
      ORDER BY t.updated_at DESC
      LIMIT 10
    `, [req.user.id]);

    res.json({ stats: stats.rows[0], recent: recent.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/tasks/project/:projectId - get tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const member = await isProjectMember(req.params.projectId, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const { status, priority, assigned_to } = req.query;
    let query = `
      SELECT t.*, u.name as assigned_name, c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = $1
    `;
    const params = [req.params.projectId];

    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND t.priority = $${params.length}`; }
    if (assigned_to) { params.push(assigned_to); query += ` AND t.assigned_to = $${params.length}`; }

    query += ' ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/tasks - create task (admin only)
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('project_id').isInt().withMessage('Project ID required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, due_date, project_id, assigned_to } = req.body;
  try {
    const admin = await isProjectAdmin(project_id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required to create tasks' });

    // Validate assignee is a project member
    if (assigned_to) {
      const validMember = await isProjectMember(project_id, assigned_to);
      if (!validMember) return res.status(400).json({ message: 'Assignee is not a project member' });
    }

    const result = await pool.query(`
      INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_to, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description || '', status || 'todo', priority || 'medium', due_date || null, project_id, assigned_to || null, req.user.id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/tasks/:id - update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (task.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    const t = task.rows[0];
    const member = await isProjectMember(t.project_id, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });

    const admin = await isProjectAdmin(t.project_id, req.user.id);
    const isAssignee = t.assigned_to === req.user.id;

    // Members can only update status of their own tasks
    // Admins can update everything
    const { title, description, status, priority, due_date, assigned_to } = req.body;

    if (!admin && !isAssignee) return res.status(403).json({ message: 'You can only update tasks assigned to you' });

    let updateQuery, params;
    if (admin) {
      updateQuery = `
        UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, due_date=$5, assigned_to=$6, updated_at=NOW()
        WHERE id=$7 RETURNING *
      `;
      params = [
        title ?? t.title,
        description ?? t.description,
        status ?? t.status,
        priority ?? t.priority,
        due_date !== undefined ? due_date : t.due_date,
        assigned_to !== undefined ? assigned_to : t.assigned_to,
        req.params.id
      ];
    } else {
      // Member: only status update
      updateQuery = 'UPDATE tasks SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *';
      params = [status ?? t.status, req.params.id];
    }

    const result = await pool.query(updateQuery, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/tasks/:id - delete task (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (task.rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    const admin = await isProjectAdmin(task.rows[0].project_id, req.user.id);
    if (!admin) return res.status(403).json({ message: 'Admin access required' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
