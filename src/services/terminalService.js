const { spawn } = require('child_process');
const path = require('path');
const { resolveWorkspacePath } = require('./pathHelper');

let activeChild = null;
let cancelling = false;
const MAX_TERMINAL_OUTPUT_BYTES = Number(process.env.FALLAH_TERMINAL_MAX_OUTPUT_BYTES || 2 * 1024 * 1024);

function getWindowsCommandGuidance(command) {
  if (process.platform !== 'win32') return null;
  const normalized = String(command || '').trim().toLowerCase();
  const mappings = [
    { pattern: /^pwd$/, windows: 'cd' },
    { pattern: /^ls(?:\s|$)/, windows: 'dir' },
    { pattern: /^cat(?:\s|$)/, windows: 'type <arquivo>' },
    { pattern: /^clear$/, windows: 'cls' },
    { pattern: /^rm(?:\s|$)/, windows: 'del <arquivo> ou rmdir <pasta>' },
    { pattern: /^cp(?:\s|$)/, windows: 'copy <origem> <destino>' },
    { pattern: /^mv(?:\s|$)/, windows: 'move <origem> <destino>' },
  ];
  const match = mappings.find((entry) => entry.pattern.test(normalized));
  return match ? `Ambiente Windows detectado.\n\nUse:\n${match.windows}` : null;
}

async function runCommand(command, workspaceRoot = path.resolve(__dirname, '..', '..')) {
  if (!command || typeof command !== 'string') {
    throw new Error('Informe um comando.');
  }

  const cwd = resolveWorkspacePath(workspaceRoot, '.');
  const guidance = getWindowsCommandGuidance(command);
  if (guidance) return { command, code: 1, output: guidance, error: '', cancelled: false, guided: true };

  return new Promise((resolve, reject) => {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    const shellArg = process.platform === 'win32' ? ['/c', command] : ['-c', command];
    const child = spawn(shell, shellArg, { cwd, windowsHide: true });
    activeChild = child;
    cancelling = false;

    let output = '';
    let errors = '';

    let truncated = false;
    const appendLimited = (current, data) => {
      const remaining = MAX_TERMINAL_OUTPUT_BYTES - Buffer.byteLength(current, 'utf8');
      if (remaining <= 0) { truncated = true;return current; }
      const chunk = data.toString();
      if (Buffer.byteLength(chunk, 'utf8') > remaining) truncated = true;
      return current + Buffer.from(chunk).subarray(0, remaining).toString('utf8');
    };
    child.stdout.on('data', (data) => { output = appendLimited(output, data); });
    child.stderr.on('data', (data) => { errors = appendLimited(errors, data); });
    child.on('close', (code) => {
      const cancelled = cancelling;
      activeChild = null;
      cancelling = false;
      resolve({ command, code, output: output.trim(), error: errors.trim(), cancelled, truncated });
    });
    child.on('error', (err) => {
      activeChild = null;
      cancelling = false;
      reject(err);
    });
  });
}

function cancelCommand() {
  if (!activeChild) {
    return false;
  }
  cancelling = true;
  activeChild.kill();
  return true;
}

module.exports = {
  runCommand,
  cancelCommand,
  getWindowsCommandGuidance,
};
