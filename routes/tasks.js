const express = require('express');
const router = express.Router();
const { read, write, nextId } = require('../store');

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}
function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
function isTaskRelevant(task, dow) {
  return task.active && (task.recurrence === 'daily' || (task.recurrence === 'weekly' && task.day_of_week === dow));
}

// GET /api/tasks?child_id=&date=   → tasks for that date
// GET /api/tasks?child_id=         → all active tasks (admin)
router.get('/', (req, res) => {
  const { child_id, date } = req.query;
  const db = read();
  let tasks = db.tasks.filter(t => t.active);
  if (child_id) tasks = tasks.filter(t => t.child_id === parseInt(child_id));
  if (date) {
    const d = date === 'today' ? todayStr() : date;
    const dow = dayOfWeek(d);
    tasks = tasks.filter(t => isTaskRelevant(t, dow));
  }
  tasks.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { child_id, title, recurrence = 'daily', day_of_week, reward_points = 1 } = req.body;
  if (!child_id) return res.status(400).json({ error: 'child_id is required' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  if (!['daily', 'weekly'].includes(recurrence)) return res.status(400).json({ error: 'recurrence must be daily or weekly' });
  if (recurrence === 'weekly' && (day_of_week == null || day_of_week < 0 || day_of_week > 6)) {
    return res.status(400).json({ error: 'day_of_week (0-6) is required for weekly tasks' });
  }
  const db = read();
  const childTasks = db.tasks.filter(t => t.child_id === parseInt(child_id) && t.active);
  const maxOrder = childTasks.reduce((m, t) => Math.max(m, t.sort_order || 0), -1);
  const task = {
    id: nextId(db, 'tasks'),
    child_id: parseInt(child_id),
    title: title.trim(),
    recurrence,
    day_of_week: recurrence === 'weekly' ? parseInt(day_of_week) : null,
    reward_points: parseInt(reward_points) || 1,
    sort_order: maxOrder + 1,
    active: true,
    created_at: new Date().toISOString(),
  };
  db.tasks.push(task);
  write(db);
  res.status(201).json(task);
});

router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = read();
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { title, recurrence, day_of_week, reward_points, sort_order } = req.body;
  if (title !== undefined) task.title = title.trim();
  if (recurrence !== undefined) {
    task.recurrence = recurrence;
    task.day_of_week = recurrence === 'daily' ? null : (day_of_week !== undefined ? parseInt(day_of_week) : task.day_of_week);
  } else if (day_of_week !== undefined) {
    task.day_of_week = parseInt(day_of_week);
  }
  if (reward_points !== undefined) task.reward_points = parseInt(reward_points) || 1;
  if (sort_order !== undefined) task.sort_order = parseInt(sort_order);
  write(db);
  res.json(task);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = read();
  const task = db.tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.active = false; // soft delete — keeps completion history
  write(db);
  res.json({ ok: true });
});

module.exports = router;
