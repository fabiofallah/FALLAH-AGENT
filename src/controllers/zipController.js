const zipService = require('../services/zipService');

exports.createZip = async (req, res) => {
  try {
    const { path: requestedPath } = req.body;
    const result = await zipService.createZip(requestedPath);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message, code: error.code || 'ZIP_CREATE_FAILED' });
  }
};

exports.downloadZip = async (req, res) => {
  try {
    const { archive } = req.query;
    const zipPath = zipService.resolveZipPath(archive);
    res.download(zipPath);
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, error: error.message, code: error.code || 'ZIP_DOWNLOAD_FAILED' });
  }
};

exports.importZip = async (req, res) => {
  try {
    const { fileName, data, confirmOverwrite } = req.body;
    if (!fileName || !data) {
      throw new Error('Nome e conteúdo do arquivo ZIP são obrigatórios.');
    }
    const result = await zipService.importZip(fileName, data, { allowOverwrite: confirmOverwrite === true });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.code === 'ZIP_OVERWRITE_CONFIRMATION_REQUIRED' ? 409 : error.statusCode || 400).json({ success: false, error: error.message, code: error.code || 'ZIP_IMPORT_FAILED', conflicts: error.conflicts || [] });
  }
};
