import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

const waitFor = async (fn, timeout = 20000, interval = 200) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await fn()) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Timed out waiting for condition');
};

test('integration: add/remove real wallet via API', async (t) => {
  const port = process.env.TEST_PORT || '4001';
  const wallet = process.env.REAL_WALLET;
  if (!wallet) throw new Error('REAL_WALLET environment variable is required for this integration test');

  // Start the agent on an isolated port
  const proc = spawn(process.execPath, ['agent/index.js'], {
    env: { ...process.env, PORT: port },
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let out = '';
  proc.stdout.on('data', (d) => (out += d.toString()));
  proc.stderr.on('data', (d) => (out += d.toString()));

  try {
    // Wait for the server to report ready
    await waitFor(async () => {
      const res = await fetch(`http://localhost:${port}/api/status`).catch(() => null);
      return res && res.ok;
    }, 20000);

    // Add wallet
    const addRes = await fetch(`http://localhost:${port}/api/wallets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: wallet }),
    });
    assert(addRes.ok, `POST /api/wallets failed: ${addRes.status}`);
    const addJson = await addRes.json();
    assert(addJson.success === true, `API did not return success: ${JSON.stringify(addJson)}`);

    // Verify wallet present
    const listRes = await fetch(`http://localhost:${port}/api/wallets`);
    assert(listRes.ok, `GET /api/wallets failed: ${listRes.status}`);
    const listJson = await listRes.json();
    assert(Array.isArray(listJson.wallets), 'wallets list missing');
    assert(listJson.wallets.includes(wallet.toLowerCase()), `Wallet not found in list: ${JSON.stringify(listJson.wallets)}`);

    // Cleanup: remove the wallet
    await fetch(`http://localhost:${port}/api/wallets/${wallet}`, { method: 'DELETE' });
  } finally {
    proc.kill();
  }
});
