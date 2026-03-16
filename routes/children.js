const express = require('express');
const router = express.Router();
const { read, write, nextId } = require('../store');

router.get('/', (req, res) => {
  const db = read();
  res.json(db.children);
});

router.post('/', (req, res) => {
  const { name, color = '#4f46e5', avatar_emoji = '⭐' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const db = read();
  const child = { id: nextId(db, 'children'), name: name.trim(), color, avatar_emoji, created_at: new Date().toISOString() };
  db.children.push(child);
  write(db);
  res.status(201).json(child);
});

router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = read();
  const child = db.children.find(c => c.id === id);
  if (!child) return res.status(404).json({ error: 'Child not found' });
  const { name, color, avatar_emoji } = req.body;
  if (name !== undefined) child.name = name.trim();
  if (color !== undefined) child.color = color;
  if (avatar_emoji !== undefined) child.avatar_emoji = avatar_emoji;
  write(db);
  res.json(child);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = read();
  const idx = db.children.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Child not found' });
  db.children.splice(idx, 1);
  // cascade: deactivate tasks, remove completions
  db.tasks.filter(t => t.child_id === id).forEach(t => t.active = false);
  db.completions = db.completions.filter(c => c.child_id !== id);
  write(db);
  res.json({ ok: true });
});

module.exports = router;
