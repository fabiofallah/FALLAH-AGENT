const comparison = require('../services/foundation/comparisonService');
const patches = require('../services/foundation/patchManagerService');
const backups = require('../services/foundation/backupManagerService');
const tests = require('../services/foundation/testRunnerService');
const auditor = require('../services/foundation/auditorService');

function action(handler, status = 200) { return async (req, res) => { try { res.status(status).json({ success: true, result: await handler(req) }); } catch (error) { res.status(400).json({ success: false, error: error.message }); } }; }

exports.compare = action((req) => {
  const { type, leftPath, rightPath } = req.body || {};
  if (type === 'files') return comparison.compareFiles(leftPath, rightPath);
  if (type === 'zips') return comparison.compareZips(leftPath, rightPath);
  return comparison.compareFolders(leftPath, rightPath);
});
exports.createPatch = action((req) => patches.createPatch(req.body), 201);
exports.applyPatch = action((req) => patches.applyPatch(req.body));
exports.rollbackPatch = action((req) => patches.rollbackPatch(req.params.id));
exports.patchHistory = action(() => patches.history());
exports.createBackup = action((req) => backups.createBackup(req.body), 201);
exports.backupHistory = action(() => backups.listBackups());
exports.restoreBackup = action((req) => backups.restoreBackup(req.params.id, req.body?.targetPath));
exports.deleteBackup = action((req) => backups.deleteBackup(req.params.id));
exports.runTests = action((req) => tests.run(req.body?.group || 'all'));
exports.runAudit = action(() => auditor.runAudit());
