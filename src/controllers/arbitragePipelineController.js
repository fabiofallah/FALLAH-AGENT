const { arbitrageDataPipelineService: pipeline } = require('../services/arbitrageDataPipelineService');
const { CollectionAuditService } = require('../services/pipeline/collectionAuditService');
const { coverageAuditService } = require('../services/pipeline/coverageAuditService');
const { RuntimeLogsService } = require('../services/pipeline/runtimeLogsService');

const collectionAuditService = new CollectionAuditService();
const runtimeLogsService = new RuntimeLogsService({ pipeline });

function action(handler, status = 200) { return async (req, res) => { try { res.status(status).json({ success: true, ...(await handler(req, res)) }); } catch (error) { res.status(400).json({ success: false, error: error.message }); } }; }
exports.status = action(async () => ({ pipeline: await pipeline.status() }));
exports.operationalMode = action(async (req) => ({ operational: await pipeline.setOperationalMode(req.body?.mode) }));
exports.generateReaders = action(async () => ({ readers: await pipeline.regenerate() }));
exports.readerActive = action(async (req) => ({ reader: await pipeline.setReaderActive(req.params.id, Boolean(req.body?.active)) }));
exports.readerRun = action(async (req) => { const reader = (await pipeline.generator.list()).find((item) => item.id === req.params.id);if (!reader) throw new Error('Reader não encontrado.');return { result: await pipeline.runReader(reader) }; });
exports.engineData = action(async (req) => ({ engine: pipeline.engine.snapshot(req.query || {}) }));
exports.commissions = action(async () => ({ commissions: await pipeline.engine.commissions() }));
exports.setCommission = action(async (req) => ({ commission: await pipeline.engine.setCommission(req.params.houseId, req.body || {}) }));
exports.importCommissions = action(async (req) => ({ commissions: await pipeline.engine.importCommissions(req.body?.commissions) }));
exports.exportCommissions = async (_req, res) => { try { const data = await pipeline.engine.commissions();res.setHeader('Content-Disposition', 'attachment; filename="FALLAH_COMMISSIONS.json"');res.type('application/json').send(JSON.stringify(data, null, 2)); } catch (error) { res.status(400).json({ success: false, error: error.message }); } };
exports.robotStatus = action(async () => ({ robot: pipeline.engine.robotStatus() }));
exports.auditPanel = action(async (req) => ({ panel: await collectionAuditService.buildPanel(req.query || {}) }));
exports.auditEvent = action(async (req) => ({ detail: await collectionAuditService.eventDetail({ ...req.query, eventId: req.params.eventId }) }));
exports.coverageAudit = action(async () => ({ audit: await coverageAuditService.build() }));
exports.logsPanel = action(async (req) => ({ logs: await runtimeLogsService.panel(req.query || {}) }));
exports.logsCopyDiagnostic = action(async (req) => ({ diagnostic: await runtimeLogsService.copyDiagnostic(req.query || {}) }));
exports.logsExportDiagnostic = async (req, res) => {
	try {
		const exported = await runtimeLogsService.exportDiagnostic(req.query || {});
		res.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
		res.type('application/json').send(JSON.stringify(exported.payload, null, 2));
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};
exports.auditExport = async (req, res) => {
	try {
		const payload = await collectionAuditService.exportAudit(req.query || {});
		const stamp = new Date().toISOString().replace(/[:.]/g, '-');
		res.setHeader('Content-Disposition', `attachment; filename="FALLAH_COLLECTION_AUDIT_${stamp}.json"`);
		res.type('application/json').send(JSON.stringify(payload, null, 2));
	} catch (error) {
		res.status(400).json({ success: false, error: error.message });
	}
};
