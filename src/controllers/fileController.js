const fileService = require('../services/fileService');

exports.readFile = async (req, res) => {
  try {
    const { path: requestedPath } = req.body;
    const content = await fileService.readFile(requestedPath);
    res.json({ success: true, content });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.writeFile = async (req, res) => {
  try {
    const { path: requestedPath, content } = req.body;
    await fileService.writeFile(requestedPath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
