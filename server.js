const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/children',    require('./routes/children'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api/summary',     require('./routes/summary'));

// Catch-all: serve admin.html for unknown routes so direct navigation works
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = 'localhost';
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
  }
  console.log(`\nReward Chart running!`);
  console.log(`  Display (monitor): http://localhost:${PORT}/display.html`);
  console.log(`  Admin (phone):     http://${localIp}:${PORT}/admin.html`);
  console.log(`  History:           http://localhost:${PORT}/history.html\n`);
});
