const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const PREFIX = 'enc:v1:';

class CredentialService {
  constructor(options = {}) {
    const localData = process.env.LOCALAPPDATA || path.join(os.homedir(), '.fallah-agent');
    this.keyPath = path.resolve(options.keyPath || path.join(localData, 'FallahAgent', 'credentials.key'));
  }

  async getKey() {
    await fs.ensureDir(path.dirname(this.keyPath));
    if (!(await fs.pathExists(this.keyPath))) await fs.writeFile(this.keyPath, crypto.randomBytes(32), { mode: 0o600 });
    const key = await fs.readFile(this.keyPath);
    if (key.length !== 32) throw new Error('Arquivo de proteção de credenciais inválido.');
    return key;
  }

  async protect(value) {
    const plain = String(value || '');
    if (!plain || plain.startsWith(PREFIX)) return plain;
    const key = await this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `${PREFIX}${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
  }

  async unprotect(value) {
    const stored = String(value || '');
    if (!stored || !stored.startsWith(PREFIX)) return stored;
    const [, , ivRaw, tagRaw, encryptedRaw] = stored.split(':');
    const key = await this.getKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64')), decipher.final()]).toString('utf8');
  }
}

module.exports = { CredentialService, credentialService: new CredentialService(), CREDENTIAL_PREFIX: PREFIX };
