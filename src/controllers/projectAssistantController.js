const moduleCenterService = require('../services/projectAssistantService');

function action(handler) {
  return async (req, res) => {
    try { res.json({ success: true, ...(await handler(req)) }); }
    catch (error) { res.status(400).json({ success: false, error: error.message }); }
  };
}

exports.listModules = action(async () => ({ modules: await moduleCenterService.listModules() }));
exports.getModule = action(async (req) => ({ module: await moduleCenterService.getModule(req.params.id) }));
exports.updateModule = action(async (req) => ({ module: await moduleCenterService.updateModule(req.params.id) }));
exports.uninstallModule = action(async (req) => ({ module: await moduleCenterService.uninstallModule(req.params.id) }));
exports.configureModule = action(async (req) => ({ module: await moduleCenterService.configureModule(req.params.id, req.body || {}) }));
