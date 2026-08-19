const { discoveryEngineService } = require('../services/discoveryEngineService');

function action(handler, status = 200) { return async (req, res) => { try { res.status(status).json({ success: true, ...(await handler(req, res)) }); } catch (error) { res.status(400).json({ success: false, error: error.message }); } }; }

exports.list = action(async () => ({ houses: await discoveryEngineService.listHouses() }));
exports.saveConfiguration = action(async () => ({ result: await discoveryEngineService.saveHouseConfiguration() }));
exports.create = action(async (req) => ({ house: await discoveryEngineService.addHouse(req.body || {}) }), 201);
exports.update = action(async (req) => ({ house: await discoveryEngineService.updateHouse(req.params.id, req.body || {}) }));
exports.remove = action(async (req) => ({ house: await discoveryEngineService.deleteHouse(req.params.id) }));
exports.activate = action(async (req) => ({ house: await discoveryEngineService.setActive(req.params.id, Boolean(req.body?.active)) }));
exports.block = action(async (req) => ({ house: await discoveryEngineService.setBlocked(req.params.id, Boolean(req.body?.blocked)) }));
exports.run = action(async (req) => ({ result: await discoveryEngineService.runDiscovery(req.params.id, req.body || {}) }));
exports.status = action(async (req) => ({ job: await discoveryEngineService.getDiscoveryStatus(req.params.id) }));
exports.importProfile = action(async (req) => ({ house: await discoveryEngineService.importProfile(req.body?.profile) }));
exports.importHouses = action(async (req) => ({ result: await discoveryEngineService.importHouses(req.body?.configuration) }));
exports.exportHouses = async (_req, res) => { try { const data = await discoveryEngineService.exportHouses();res.setHeader('Content-Disposition', 'attachment; filename="FALLAH_HOUSES.json"');res.type('application/json').send(JSON.stringify(data, null, 2)); } catch (error) { res.status(400).json({ success: false, error: error.message }); } };
exports.exportProfile = async (req, res) => { try { const result = await discoveryEngineService.getProfile(req.params.id);res.download(result.file, result.house.profileFile); } catch (error) { res.status(400).json({ success: false, error: error.message }); } };
