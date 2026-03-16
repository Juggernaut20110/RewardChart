const express = require('express');
const router = express.Router();
const { read, write, nextId } = require('../store');

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

router.get('/', (req, res) => {
  const { date, child_id } = req.query;
  const d = !date || date === 'today' ? todayStr() : date;
  const db = read();
  let completions = db.completions.filter(c => c.date === d);
  if (child_id) completions = completions.filter(c => c.child_id === parseInt(child_id));
  res.json(completions);
});

router.post('/', (req, res) => {
  const { task_id, date } = req.body;
  if (!task_id) return res.status(400).json({ error: 'task_id is required' });
  const d = !date || date === 'today' ? todayStr() : date;
  const db = read();
  const task = db.tasks.find(t => t.id === parseInt(task_id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const exists = db.completions.find(c => c.task_id === parseInt(task_id) && c.date === d);
  if (exists) return res.status(409).json({ error: 'Already completed' });
  const completion = {
    id: nextId(db, 'completions'),
    task_id: parseInt(task_id),
    child_id: task.child_id,
    date: d,
    completed_at: new Date().toISOString(),
  };
  db.completions.push(completion);
  write(db);
  res.status(201).json(completion);
});

router.delete('/:task_id/:date', (req, res) => {
  const db = read();
  const task_id = parseInt(req.params.task_id);
  const idx = db.completions.findIndex(c => c.task_id === task_id && c.date === req.params.date);
  if (idx === -1) return res.status(404).json({ error: 'Completion not found' });
  db.completions.splice(idx, 1);
  write(db);
  res.json({ ok: true });
});

module.exports = router;
