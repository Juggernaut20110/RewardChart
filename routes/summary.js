const express = require('express');
const router = express.Router();
const { read } = require('../store');

function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}
function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
function isRelevant(task, dow) {
  return task.active && (task.recurrence === 'daily' || (task.recurrence === 'weekly' && task.day_of_week === dow));
}

// GET /api/summary?date=
router.get('/', (req, res) => {
  const { date } = req.query;
  const d = !date || date === 'today' ? todayStr() : date;
  const dow = dayOfWeek(d);
  const db = read();

  const completedSet = new Set(
    db.completions.filter(c => c.date === d).map(c => c.task_id)
  );

  const children = db.children.map(child => {
    const childTasks = db.tasks
      .filter(t => t.child_id === child.id && isRelevant(t, dow))
      .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))
      .map(t => ({ ...t, completed: completedSet.has(t.id) }));
    return {
      ...child,
      tasks: childTasks,
      total: childTasks.length,
      completed: childTasks.filter(t => t.completed).length,
    };
  });

  res.json({ date: d, children });
});

// GET /api/summary/history?child_id=&days=30
router.get('/history', (req, res) => {
  const { child_id, days = 30 } = req.query;
  if (!child_id) return res.status(400).json({ error: 'child_id is required' });
  const cid = parseInt(child_id);
  const numDays = Math.min(Math.max(parseInt(days) || 30, 1), 365);
  const db = read();

  const history = [];
  for (let i = 0; i < numDays; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const dateStr = dt.toLocaleDateString('en-CA');
    const dow = dayOfWeek(dateStr);

    const activeTasks = db.tasks.filter(t => t.child_id === cid && isRelevant(t, dow));
    const completedIds = new Set(
      db.completions.filter(c => c.child_id === cid && c.date === dateStr).map(c => c.task_id)
    );

    // include inactive tasks that were completed that day
    const extraIds = [...completedIds].filter(tid => !activeTasks.find(t => t.id === tid));
    const extraTasks = extraIds.map(tid => db.tasks.find(t => t.id === tid)).filter(Boolean);

    const allTasks = [...activeTasks, ...extraTasks].map(t => ({
      id: t.id,
      title: t.title,
      recurrence: t.recurrence,
      reward_points: t.reward_points,
      completed: completedIds.has(t.id),
    }));

    const points = allTasks.filter(t => t.completed).reduce((s, t) => s + (t.reward_points || 1), 0);

    history.push({
      date: dateStr,
      tasks: allTasks,
      total: allTasks.length,
      completed: [...completedIds].filter(id => allTasks.find(t => t.id === id)).length,
      points,
    });
  }

  res.json(history);
});

module.exports = router;
