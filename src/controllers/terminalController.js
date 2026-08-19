const terminalService = require('../services/terminalService');

exports.execute = async (req, res) => {
  try {
    const { command } = req.body;
    const result = await terminalService.runCommand(command);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const cancelled = terminalService.cancelCommand();
    res.json({ success: true, cancelled });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
