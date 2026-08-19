const scannerService = require('../services/scannerService');

function compactState(state) {
  const { tree, index, ...compact } = state;
  return compact;
}

exports.scan = async (req, res) => {
  try {
    scannerService.startScan().catch(() => {
      // State is exposed via getScanState; errors are reflected there.
    });
    res.json({ success: true, scan: compactState(scannerService.getScanState()) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.state = async (req, res) => {
  try {
    res.json({ success: true, scan: compactState(scannerService.getScanState()) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const cancelled = scannerService.cancelScan();
    res.json({ success: true, cancelled, scan: compactState(scannerService.getScanState()) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.tree = async (req, res) => {
  try {
    const tree = scannerService.getTree();
    const page = Math.max(1, Number(req.query.page) || 1);const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    res.json({ success: true, tree: tree.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: tree.length, pages: Math.max(1, Math.ceil(tree.length / limit)) } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.summary = async (req, res) => {
  try {
    const summary = scannerService.getSummary();
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.index = async (req, res) => {
  try {
    const index = scannerService.getIndex();
    const page = Math.max(1, Number(req.query.page) || 1);const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    res.json({ success: true, index: index.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: index.length, pages: Math.max(1, Math.ceil(index.length / limit)) } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
