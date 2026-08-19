const path = require('path');

exports.status = (req, res) => {
  const workspaceRoot = process.env.WORKSPACE_ROOT || path.resolve(__dirname, '..', '..');
  res.json({ success: true, status: 'ok', workspace: workspaceRoot });
};
