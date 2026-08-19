const { liveAuditLabService } = require('../services/liveAuditLabService');

function action(handler, status = 200) {
  return async (req, res) => {
    try {
      const payload = await handler(req, res);
      res.status(status).json({ success: true, ...payload });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}

function parseHouses(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return String(value)
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

exports.houses = action(async () => ({ houses: await liveAuditLabService.listHouses() }));
exports.searchEvents = action(async (req) => ({
  result: await liveAuditLabService.searchEvents({
    query: req.query?.query || '',
    modality: req.query?.modality || '',
    eventDate: req.query?.eventDate || '',
    eventTime: req.query?.eventTime || '',
    participantA: req.query?.participantA || '',
    participantB: req.query?.participantB || '',
    houses: parseHouses(req.query?.houses),
  }),
}));
exports.eventCoverage = action(async (req) => ({ coverage: await liveAuditLabService.eventCoverage({ canonicalEvent: req.query?.canonicalEvent || '', houses: parseHouses(req.query?.houses) }) }));
exports.markets = action(async (req) => ({ markets: await liveAuditLabService.listMarkets({ canonicalEvent: req.query?.canonicalEvent || '', houses: parseHouses(req.query?.houses) }) }));
exports.marketView = action(async (req) => ({ market: await liveAuditLabService.marketView({ canonicalEvent: req.query?.canonicalEvent || '', marketKey: req.query?.marketKey || '', houses: parseHouses(req.query?.houses) }) }));
exports.raw = action(async (req) => ({ raw: await liveAuditLabService.rawView({ houseId: req.query?.houseId || '', canonicalEvent: req.query?.canonicalEvent || '', sourceMarketId: req.query?.sourceMarketId || '', selection: req.query?.selection || '' }) }));
exports.arbitrageAudit = action(async (req) => ({ audit: await liveAuditLabService.arbitrageAudit({ houses: parseHouses(req.query?.houses), query: req.query?.query || '' }) }));
exports.validationStatus = action(async () => ({ validation: await liveAuditLabService.houseValidationStatus() }));
exports.homologate = action(async (req) => ({ homologation: await liveAuditLabService.homologate(req.body || {}) }));
exports.invalidateHomologation = action(async (req) => ({ invalidation: await liveAuditLabService.invalidateHomologation(req.body || {}) }));
exports.homologationHistory = action(async () => ({ history: await liveAuditLabService.listHomologations() }));
exports.saveAuditRecord = action(async (req) => ({ audit: await liveAuditLabService.saveAuditRecord(req.body || {}) }));
exports.auditHistory = action(async () => ({ history: await liveAuditLabService.listAuditHistory() }));
exports.reportIssue = action(async (req) => ({ issue: await liveAuditLabService.reportIssue(req.body || {}) }));
exports.issueHistory = action(async () => ({ history: await liveAuditLabService.listIssues() }));
exports.detectStructuralChange = action(async (req) => ({ change: await liveAuditLabService.detectStructuralChanges(req.query?.houseId || req.body?.houseId || '') }));
