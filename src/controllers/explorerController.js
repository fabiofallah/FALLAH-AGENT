const explorerService = require('../services/explorerService');

exports.workspaceTree = async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    const includeSystemFiles = String(req.query.includeSystem || '').toLowerCase() === 'true';
    const tree = await explorerService.workspaceTree(requestedPath, includeSystemFiles);
    res.json({ success: true, tree });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.explorePath = async (req, res) => {
  try {
    const requestedPath = req.query.path || '';
    const includeSystemFiles = String(req.query.includeSystem || '').toLowerCase() === 'true';
    const payload = await explorerService.listDirectory(requestedPath, includeSystemFiles);
    res.json({ success: true, directory: payload.directory, listing: payload.listing });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.createNode = async (req, res) => {
  try {
    const { type, basePath, name } = req.body;
    await explorerService.createNode(type, basePath, name);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.renameNode = async (req, res) => {
  try {
    const { targetPath, newName } = req.body;
    await explorerService.renamePath(targetPath, newName);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteNode = async (req, res) => {
  try {
    const { targetPath } = req.body;
    await explorerService.deletePath(targetPath);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.pasteNode = async (req, res) => {
  try {
    const { item, destinationPath } = req.body;
    await explorerService.pasteNode(item, destinationPath);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.duplicateNode = async (req, res) => {
  try {
    const { path } = req.body;
    await explorerService.duplicatePath(path);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
