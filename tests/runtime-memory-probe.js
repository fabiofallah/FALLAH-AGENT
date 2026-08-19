const fs = require('fs');

const durationMs = Number(process.env.FALLAH_PROBE_DURATION_MS || 600000);
const intervalMs = Number(process.env.FALLAH_PROBE_INTERVAL_MS || 15000);
const output = process.env.FALLAH_PROBE_OUTPUT || 'workspace/arbitrage-pipeline/runtime-memory-probe.json';

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const value = await response.json();
  return typeof value === 'string' ? JSON.parse(value) : value;
}

async function sample() {
  const [status, engine] = await Promise.all([
    json('http://127.0.0.1:37621/api/pipeline/status'),
    json('http://127.0.0.1:37621/api/arbitrage-engine/status'),
  ]);
  const pipeline = status.pipeline;
  const readers = (pipeline.readers || []).map((reader) => ({
    house: reader.houseName,
    status: reader.runtime?.status,
    cycles: reader.runtime?.cycles || 0,
    firstRequest: reader.runtime?.firstSuccessfulRequestAt || null,
    firstData: reader.runtime?.firstAcceptedRecordAt || null,
    firstOdd: reader.runtime?.firstFreshAt || null,
    lastFresh: reader.runtime?.lastFreshAt || null,
    errors: reader.runtime?.errors || 0,
    retries: reader.runtime?.retries || 0,
    heartbeat: reader.runtime?.heartbeatHealthy !== false,
  }));
  const memory = pipeline.diagnostics.memory;
  return {
    at: new Date().toISOString(),
    rssMB: +(memory.rssBytes / 1048576).toFixed(2),
    heapUsedMB: +(memory.heapUsedBytes / 1048576).toFixed(2),
    heapTotalMB: +(memory.heapTotalBytes / 1048576).toFixed(2),
    externalMB: +(memory.externalBytes / 1048576).toFixed(2),
    houses: readers.filter((reader) => reader.firstRequest).length,
    freshHouses: readers.filter((reader) => reader.lastFresh).length,
    cycles: readers.reduce((sum, reader) => sum + reader.cycles, 0),
    opportunities: (engine.engine?.opportunities || []).length,
    readers,
  };
}

async function run() {
  const startedAt = new Date();
  const samples = [];
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    try { samples.push(await sample()); }
    catch (error) { samples.push({ at: new Date().toISOString(), error: error.message }); }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  const report = { schema: 'fallah.runtime-memory-probe/v1', startedAt: startedAt.toISOString(), endedAt: new Date().toISOString(), durationSeconds: +((Date.now() - startedAt.getTime()) / 1000).toFixed(1), samples };
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  const valid = samples.filter((item) => Number.isFinite(item.rssMB));
  const nearest = (minutes) => valid.reduce((best, item) => Math.abs(Date.parse(item.at) - (startedAt.getTime() + minutes * 60000)) < Math.abs(Date.parse(best.at) - (startedAt.getTime() + minutes * 60000)) ? item : best, valid[0]);
  console.log(JSON.stringify({ start: valid[0], oneMinute: nearest(1), twoMinute: nearest(2), fiveMinute: nearest(5), tenMinute: valid.at(-1), peakRssMB: Math.max(...valid.map((item) => item.rssMB)), errors: samples.length - valid.length }, null, 2));
}

run().catch((error) => { console.error(error);process.exitCode = 1; });
