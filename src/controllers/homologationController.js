const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const { homologationService } = require('../services/homologationService');
function action(handler) { return async (req, res) => { try { res.json({ success: true, ...(await handler(req)) }); } catch (error) { res.status(400).json({ success: false, error: error.message }); } }; }
exports.status = action(async () => ({ report: await homologationService.status() }));
exports.run = action(async () => ({ report: await homologationService.run({ stress: true }) }));
exports.importOddsAgora = action(async (req) => ({ imported: await homologationService.importOddsAgora(req.body?.dataset ?? req.body?.text) }));
exports.exportReport = async (req, res) => { try { const report = homologationService.lastReport || await homologationService.status();const format = String(req.params.format || 'json').toLowerCase();if (format === 'csv') { res.setHeader('Content-Disposition', 'attachment; filename="FALLAH_HOMOLOGATION.csv"');res.type('text/csv').send(homologationService.csv(report));return; }if (format === 'logs') { const zip = new AdmZip();for (const root of homologationService.logFiles()) { const stat = await fs.stat(root);if (stat.isDirectory()) zip.addLocalFolder(root, path.basename(root));else zip.addLocalFile(root); }res.setHeader('Content-Disposition', 'attachment; filename="FALLAH_HOMOLOGATION_LOGS.zip"');res.type('application/zip').send(zip.toBuffer());return; }res.setHeader('Content-Disposition', `attachment; filename="FALLAH_HOMOLOGATION.${format === 'report' ? 'report.json' : 'json'}"`);res.type('application/json').send(JSON.stringify(report, null, 2)); } catch (error) { res.status(400).json({ success: false, error: error.message }); } };
