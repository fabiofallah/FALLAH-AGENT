const { arbitrageEngineService } = require('../services/arbitrageEngineService');
function action(handler) { return async (req, res) => { try { res.json({ success: true, ...(await handler(req)) }); } catch (error) { res.status(400).json({ success: false, error: error.message }); } }; }
exports.status = action(async () => ({ engine: arbitrageEngineService.status() }));
exports.evaluate = action(async () => ({ opportunities: await arbitrageEngineService.evaluate() }));
exports.configure = action(async (req) => ({ configuration: await arbitrageEngineService.configure(req.body || {}) }));
exports.preflight = action(async () => ({ preflight: await arbitrageEngineService.generatePreflight() }));
exports.audit = action(async () => ({
	audit: arbitrageEngineService.status().audit || {
		schema: 'fallah.arbitrage-audit/v1',
		generatedAt: new Date().toISOString(),
		counters: {},
		opportunities: [],
		rejected: [],
	},
}));
