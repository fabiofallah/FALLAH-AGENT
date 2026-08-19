const test = require('node:test');
const assert = require('node:assert/strict');
const { LiveCycleScheduler } = require('../src/services/arbitrageDataPipelineService');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scheduled(scheduler, id, work) {
  const release = await scheduler.acquire({ house: id, readerId: id });
  let error = null;
  try { return await work(); }
  catch (caught) { error = caught; throw caught; }
  finally { release(error ? 'ERROR' : 'OK', error); }
}

test('scheduler serializes heavy cycles and preserves FIFO fairness', async () => {
  const scheduler = new LiveCycleScheduler({ max: 1, criticalRssBytes: 0 });
  let active = 0;
  let peak = 0;
  const order = [];
  const run = (id) => scheduled(scheduler, id, async () => {
    active += 1; peak = Math.max(peak, active); order.push(`start:${id}`);
    await delay(15);
    order.push(`end:${id}`); active -= 1;
  });
  await Promise.all([run('A'), run('B'), run('C')]);
  assert.equal(peak, 1);
  assert.deepEqual(order, ['start:A', 'end:A', 'start:B', 'end:B', 'start:C', 'end:C']);
});

test('error and timeout release the slot for the next reader', async () => {
  const scheduler = new LiveCycleScheduler({ max: 1, criticalRssBytes: 0 });
  const seen = [];
  const failure = scheduled(scheduler, 'ERROR', async () => { throw new Error('HTTP 403'); });
  const timeout = scheduled(scheduler, 'TIMEOUT', async () => {
    await new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10));
  });
  const next = scheduled(scheduler, 'NEXT', async () => { seen.push('NEXT'); });
  const results = await Promise.allSettled([failure, timeout, next]);
  assert.deepEqual(results.map((item) => item.status), ['rejected', 'rejected', 'fulfilled']);
  assert.deepEqual(seen, ['NEXT']);
  assert.equal(scheduler.active, 0);
  assert.equal(scheduler.queue.length, 0);
});
