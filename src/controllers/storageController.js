const { storageService } = require('../services/storageService');

exports.report = async (req, res) => {
  try {
    const force = String(req.query.force || '').toLowerCase() === 'true';
    const report = await storageService.getReport(force);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.smartCleanup = async (req, res) => {
  try {
    const result = await storageService.smartCleanup(req.body || {});
    res.json({ success: true, cleanup: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cleanupPreview = async (req, res) => {
  try {
    const includeBackups = String(req.query.includeBackups || '').toLowerCase() === 'true';
    res.json({ success: true, preview: await storageService.cleanupPreview({ includeBackups }) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.limits = async (req, res) => {
  try {
    res.json({ success: true, limits: storageService.getLimits() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateLimits = async (req, res) => {
  try {
    const limits = storageService.updateLimits(req.body || {});
    const report = await storageService.getReport(true);
    res.json({ success: true, limits, report });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
