const { aiManagerService } = require('../services/aiManagerService');

exports.getConfig = async (req, res) => {
  try {
    const config = await aiManagerService.getConfig();
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.saveConfig = async (req, res) => {
  try {
    const { providerId, model, apiKey, active } = req.body || {};
    const config = await aiManagerService.saveProviderConfig({ providerId, model, apiKey, active });
    res.json({ success: true, config });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.setActiveProvider = async (req, res) => {
  try {
    const { providerId } = req.body || {};
    const config = await aiManagerService.setActiveProvider(providerId);
    res.json({ success: true, config });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.testProvider = async (req, res) => {
  try {
    const { providerId } = req.body || {};
    const result = await aiManagerService.testProvider(providerId);
    const config = await aiManagerService.getConfig();
    res.json({ success: true, result, config });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getCapabilities = async (req, res) => {
  try {
    const capabilities = await aiManagerService.getCapabilities();
    res.json({ success: true, capabilities });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
