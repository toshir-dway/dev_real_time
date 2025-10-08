const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Task status and version
let current_task_status = 'En attente';
let status_version = 1; // Start at 1 for initial version

// Pending long-polling responses
let pendingClients = [];

// Helper to notify all pending clients
function notifyClients() {
  pendingClients.forEach(({ res, timeout }) => {
    if (timeout) clearTimeout(timeout);
    res.json({ status: current_task_status, version: status_version });
  });
  pendingClients = [];
}

// Admin endpoint to update status
app.post('/update-status', (req, res) => {
  let { status } = req.body;
  if (status === undefined || status === null) {
    return res.status(400).json({ error: 'Missing status' });
  }
  status = String(status);
  current_task_status = status;
  status_version++;
  notifyClients();
  res.json({ status: current_task_status, version: status_version });
});

// Long Polling endpoint
app.get('/poll-status', (req, res) => {
  let last_version = 0;
  if (
    'last_version' in req.query &&
    req.query.last_version !== undefined &&
    req.query.last_version !== null &&
    req.query.last_version !== ''
  ) {
    last_version = parseInt(req.query.last_version, 10);
    if (isNaN(last_version)) last_version = 0;
  }
  // Always respond with current status/version if client is behind
  if (last_version < status_version) {
    return res.json({ status: current_task_status, version: status_version });
  }
  // Status not changed, hold connection
  const client = { res };
  client.timeout = setTimeout(() => {
    const idx = pendingClients.indexOf(client);
    if (idx !== -1) {
      pendingClients.splice(idx, 1);
      console.log('Timeout: sending 204 No Content to client');
      res.status(204).end(); // No Content
    }
  }, 25000);
  pendingClients.push(client);
});

app.listen(PORT, () => {
  console.log(`Long Polling server running on http://localhost:${PORT}`);
});
