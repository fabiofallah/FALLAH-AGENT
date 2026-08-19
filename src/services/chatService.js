const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { aiManagerService } = require('./aiManagerService');
const fileService = require('./fileService');
const explorerService = require('./explorerService');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const CHAT_FOLDER = path.join(WORKSPACE_ROOT, 'workspace', 'chat');
const CONVERSATIONS_FOLDER = path.join(CHAT_FOLDER, 'conversations');
const VALID_MESSAGE_ROLES = ['user', 'assistant', 'system'];
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set(['.txt', '.md', '.pdf', '.docx', '.json', '.csv', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const MAX_ATTACHMENT_BYTES = 7 * 1024 * 1024;
const MAX_MESSAGE_ATTACHMENTS_BYTES = 30 * 1024 * 1024;

const CHAT_SYSTEM_PROMPT = `Você é o FALLAH AGENT, assistente do projeto aberto. Responda em português do Brasil.
Quando o usuário pedir explicitamente uma operação de arquivo, responda SOMENTE com JSON válido no formato:
{"message":"resumo para o usuário","actions":[{"type":"write","path":"caminho/relativo","content":"conteúdo completo"},{"type":"delete","path":"caminho/relativo"},{"type":"rename","path":"caminho/atual","newName":"novo-nome.ext"}]}
Use write para criar ou substituir arquivos. Nunca execute ação não solicitada explicitamente. Use somente caminhos relativos à raiz do projeto. Para perguntas sem operação, responda normalmente em texto, sem JSON.`;

async function ensureChatFolder() {
  await fs.ensureDir(CONVERSATIONS_FOLDER);
}

function safeId(id) {
  if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Identificador de conversa inválido.');
  }
  const filePath = path.resolve(CONVERSATIONS_FOLDER, `${id}.json`);
  if (!filePath.startsWith(CONVERSATIONS_FOLDER)) {
    throw new Error('Caminho de conversa inválido.');
  }
  return filePath;
}

function normalizeAttachment(attachment = {}) {
  const name = path.basename(String(attachment.name || '').trim());
  const extension = path.extname(name).toLowerCase();
  if (!name || !ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) throw new Error(`Tipo de anexo não permitido: ${name || 'sem nome'}`);
  const data = String(attachment.data || '');
  if (Buffer.byteLength(data, 'base64') > MAX_ATTACHMENT_BYTES) throw new Error(`Anexo excede 7 MB: ${name}`);
  return { id: String(attachment.id || crypto.randomUUID()), name, type: String(attachment.type || 'application/octet-stream'), data };
}

function normalizeMessage(message = {}) {
  const attachments = Array.isArray(message.attachments) ? message.attachments.map(normalizeAttachment) : [];
  const totalAttachmentBytes = attachments.reduce((total, attachment) => total + Buffer.byteLength(attachment.data || '', 'base64'), 0);
  if (totalAttachmentBytes > MAX_MESSAGE_ATTACHMENTS_BYTES) throw new Error('Anexos da mensagem excedem o limite total de 30 MB.');
  return {
    id: String(message.id || crypto.randomUUID()),
    role: VALID_MESSAGE_ROLES.includes(message.role) ? message.role : 'user',
    text: String(message.text || ''),
    timestamp: message.timestamp || new Date().toISOString(),
    provider: message.provider || null,
    model: message.model || null,
    attachments,
  };
}

function normalizeConversation(conversation = {}) {
  return {
    ...conversation,
    pinned: Boolean(conversation.pinned),
    favorite: Boolean(conversation.favorite || conversation.pinned),
    organization: {
      projectId: conversation.organization?.projectId || null,
      tags: Array.isArray(conversation.organization?.tags) ? conversation.organization.tags : [],
    },
    memory: {
      conversation: Array.isArray(conversation.memory?.conversation) ? conversation.memory.conversation : [],
      project: Array.isArray(conversation.memory?.project) ? conversation.memory.project : [],
      permanent: Array.isArray(conversation.memory?.permanent) ? conversation.memory.permanent : [],
    },
    share: conversation.share && typeof conversation.share === 'object' ? conversation.share : { enabled: false, token: null, createdAt: null },
    messages: Array.isArray(conversation.messages) ? conversation.messages.map(normalizeMessage) : [],
  };
}

function createConversationObject({ name = 'Untitled conversation', messages = [] } = {}) {
  const id = crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g, '-');
  const timestamp = new Date().toISOString();
  return {
    id,
    name: String(name).trim() || 'Untitled conversation',
    createdAt: timestamp,
    updatedAt: timestamp,
    pinned: false,
    favorite: false,
    organization: { projectId: null, tags: [] },
    memory: { conversation: [], project: [], permanent: [] },
    share: { enabled: false, token: null, createdAt: null },
    messages: messages.map(normalizeMessage),
  };
}

function paginationValues(page, limit, maximum = 100) {
  return { page: Math.max(1, Number(page) || 1), limit: Math.min(maximum, Math.max(1, Number(limit) || 25)) };
}

async function listConversations(options = {}) {
  await ensureChatFolder();
  const files = await fs.readdir(CONVERSATIONS_FOLDER);
  const conversations = [];
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.json')) continue;
    try {
      const convo = normalizeConversation(await fs.readJson(path.join(CONVERSATIONS_FOLDER, file)));
      conversations.push(convo);
    } catch (error) {
      // ignore invalid data
    }
  }
  const sorted = conversations.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt));
  if (!options.paginated) return sorted;
  const query = String(options.search || '').trim().toLowerCase();
  const filtered = query ? sorted.filter((conversation) => conversation.name.toLowerCase().includes(query) || conversation.messages.some((message) => message.text.toLowerCase().includes(query))) : sorted;
  const { page, limit } = paginationValues(options.page, options.limit, 100);
  const items = filtered.slice((page - 1) * limit, page * limit).map((conversation) => ({
    id: conversation.id, name: conversation.name, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt,
    pinned: conversation.pinned, favorite: conversation.favorite, organization: conversation.organization,
    messageCount: conversation.messages.length, messages: [],
  }));
  return { items, pagination: { page, limit, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / limit)) } };
}

async function saveConversation(conversation) {
  await ensureChatFolder();
  const filePath = safeId(conversation.id);
  conversation.updatedAt = new Date().toISOString();
  return fs.writeJson(filePath, conversation, { spaces: 2 });
}

async function createConversation(payload = {}) {
  await ensureChatFolder();
  const conversation = createConversationObject(payload);
  await saveConversation(conversation);
  return conversation;
}

async function loadConversation(id, options = {}) {
  const filePath = safeId(id);
  if (!(await fs.pathExists(filePath))) {
    throw new Error('Conversa não encontrada.');
  }
  const conversation = normalizeConversation(await fs.readJson(filePath));
  if (!options.paginated) return conversation;
  const { page, limit } = paginationValues(options.page, options.limit, 200);
  const total = conversation.messages.length;
  const end = Math.max(0, total - ((page - 1) * limit));
  const start = Math.max(0, end - limit);
  return { ...conversation, messages: conversation.messages.slice(start, end), messagePagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), hasOlder: start > 0 } };
}

async function deleteConversation(id) {
  const filePath = safeId(id);
  if (!(await fs.pathExists(filePath))) {
    throw new Error('Conversa não encontrada.');
  }
  await fs.remove(filePath);
}

async function renameConversation(id, name) {
  const conversation = await loadConversation(id);
  conversation.name = String(name).trim() || conversation.name;
  return saveConversation(conversation);
}

async function duplicateConversation(id) {
  const source = await loadConversation(id);
  return createConversation({ name: `${source.name} (cópia)`, messages: source.messages });
}

async function setConversationPinned(id, pinned) {
  const conversation = await loadConversation(id);
  conversation.pinned = Boolean(pinned);
  await saveConversation(conversation);
  return conversation;
}

async function clearConversation(id) {
  const conversation = await loadConversation(id);
  conversation.messages = [];
  await saveConversation(conversation);
  return conversation;
}

async function clearAllConversations() {
  const conversations = await listConversations();
  await Promise.all(conversations.map((conversation) => fs.remove(safeId(conversation.id))));
  return conversations.length;
}

async function prepareConversationShare(id) {
  const conversation = await loadConversation(id);
  conversation.share = { enabled: false, token: conversation.share?.token || crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'prepared' };
  await saveConversation(conversation);
  return conversation.share;
}

async function appendMessage(conversationId, message) {
  const conversation = await loadConversation(conversationId);
  const role = String(message.role || 'user');
  if (!VALID_MESSAGE_ROLES.includes(role)) {
    throw new Error('Tipo de mensagem inválido.');
  }
  const text = String(message.text || '').trim();
  if (!text && !Array.isArray(message.attachments)) {
    throw new Error('Informe o texto ou pelo menos um anexo.');
  }
  const updatedMessage = normalizeMessage({ ...message, role, text, timestamp: message.timestamp || new Date().toISOString() });
  conversation.messages.push(updatedMessage);
  await saveConversation(conversation);
  return updatedMessage;
}

async function updateMessage(conversationId, messageId, updates = {}) {
  const conversation = await loadConversation(conversationId);
  const index = conversation.messages.findIndex((message) => message.id === messageId);
  if (index < 0) throw new Error('Mensagem não encontrada.');
  const current = conversation.messages[index];
  conversation.messages[index] = normalizeMessage({ ...current, text: updates.text === undefined ? current.text : String(updates.text), provider: updates.provider === undefined ? current.provider : updates.provider, model: updates.model === undefined ? current.model : updates.model });
  await saveConversation(conversation);
  return conversation.messages[index];
}

async function deleteMessage(conversationId, messageId) {
  const conversation = await loadConversation(conversationId);
  const initialLength = conversation.messages.length;
  conversation.messages = conversation.messages.filter((message) => message.id !== messageId);
  if (conversation.messages.length === initialLength) throw new Error('Mensagem não encontrada.');
  await saveConversation(conversation);
}

async function prepareRegeneration(conversationId, messageId) {
  const conversation = await loadConversation(conversationId);
  const index = conversation.messages.findIndex((message) => message.id === messageId);
  if (index < 0) throw new Error('Mensagem não encontrada.');
  let promptIndex = index;
  if (conversation.messages[index].role !== 'user') {
    promptIndex = -1;
    for (let current = index - 1; current >= 0; current -= 1) {
      if (conversation.messages[current].role === 'user') { promptIndex = current; break; }
    }
  }
  if (promptIndex < 0) throw new Error('Prompt não encontrado para regeneração.');
  const prompt = conversation.messages[promptIndex];
  conversation.messages = conversation.messages.slice(0, promptIndex + 1);
  await saveConversation(conversation);
  return { prompt, conversation };
}

async function exportConversation(id) {
  const conversation = await loadConversation(id);
  return conversation;
}

function serializeConversation(conversation, format = 'json') {
  const normalizedFormat = String(format).toLowerCase();
  if (normalizedFormat === 'json') return { content: JSON.stringify(conversation, null, 2), contentType: 'application/json', extension: 'json' };
  const lines = conversation.messages.map((message) => {
    const metadata = [message.timestamp, message.provider, message.model].filter(Boolean).join(' · ');
    const role = message.role === 'assistant' ? 'Assistente' : message.role === 'user' ? 'Usuário' : 'Sistema';
    return { heading: `${role}${metadata ? ` (${metadata})` : ''}`, text: message.text };
  });
  if (normalizedFormat === 'md' || normalizedFormat === 'markdown') return { content: `# ${conversation.name}\n\n${lines.map((line) => `## ${line.heading}\n\n${line.text}`).join('\n\n')}`, contentType: 'text/markdown', extension: 'md' };
  if (normalizedFormat === 'txt') return { content: `${conversation.name}\n${'='.repeat(conversation.name.length)}\n\n${lines.map((line) => `${line.heading}:\n${line.text}`).join('\n\n')}`, contentType: 'text/plain', extension: 'txt' };
  throw new Error('Formato de exportação não suportado.');
}

async function importConversation(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Conteúdo de conversa inválido.');
  }
  const name = String(payload.name || 'Imported conversation').trim();
  const messages = Array.isArray(payload.messages) ? payload.messages.map(normalizeMessage) : [];
  const conversation = createConversationObject({ name, messages });
  await saveConversation(conversation);
  return conversation;
}

function parseAgentResponse(content) {
  const raw = String(content || '').trim();
  const candidate = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.actions)) return parsed;
  } catch {}
  return { message: raw, actions: [] };
}

async function executeFileActions(actions = []) {
  const results = [];
  for (const action of actions.slice(0, 20)) {
    const type = String(action?.type || '').toLowerCase();
    const targetPath = String(action?.path || '').trim();
    if (!targetPath) throw new Error('A IA retornou uma ação sem caminho de arquivo.');
    if (targetPath === '.' || targetPath === '/' || targetPath === '\\') throw new Error('A IA não pode alterar ou excluir a raiz inteira do projeto.');
    if (type === 'write' || type === 'create' || type === 'edit') {
      await fileService.writeFile(targetPath, String(action.content ?? ''));
      results.push(`${type === 'create' ? 'Criado' : 'Salvo'}: ${targetPath}`);
    } else if (type === 'delete') {
      await explorerService.deletePath(targetPath);
      results.push(`Excluído: ${targetPath}`);
    } else if (type === 'rename') {
      const newName = path.basename(String(action.newName || action.newPath || '').trim());
      if (!newName) throw new Error(`Ação rename sem novo nome para ${targetPath}.`);
      await explorerService.renamePath(targetPath, newName);
      results.push(`Renomeado: ${targetPath} → ${newName}`);
    } else {
      throw new Error(`Ação de arquivo não suportada: ${type || 'vazia'}.`);
    }
  }
  return results;
}

async function collectReferencedFileContext(text) {
  const matches = String(text || '').match(/(?:[A-Za-z0-9_.-]+[\\/])+[A-Za-z0-9_.-]+/g) || [];
  const blocks = [];
  for (const requestedPath of [...new Set(matches)].slice(0, 5)) {
    try {
      const content = await fileService.readFile(requestedPath);
      blocks.push(`ARQUIVO: ${requestedPath}\n${content.slice(0, 50000)}`);
    } catch {}
  }
  return blocks.join('\n\n');
}

function buildAttachmentContext(attachments = [], providerId) {
  const content = [];
  let textBudget = 200000;
  for (const attachment of attachments) {
    const extension = path.extname(attachment.name || '').toLowerCase();
    if (['.txt', '.md', '.json', '.csv'].includes(extension) && attachment.data && textBudget > 0) {
      const decoded = Buffer.from(attachment.data, 'base64').toString('utf8').slice(0, textBudget);
      textBudget -= decoded.length;
      content.push({ type: 'input_text', text: `ANEXO ${attachment.name}:\n${decoded}` });
    } else if (String(attachment.type || '').startsWith('image/') && attachment.data && providerId === 'openai') {
      content.push({ type: 'input_image', image_url: `data:${attachment.type};base64,${attachment.data}`, detail: 'auto' });
    } else {
      content.push({ type: 'input_text', text: `ANEXO DISPONÍVEL: ${attachment.name} (${attachment.type || 'tipo desconhecido'}). Conteúdo binário não extraído automaticamente.` });
    }
  }
  return content;
}

async function buildAiMessages(message, options = {}) {
  const text = String(message || '').trim();
  if (!text) throw new Error('Envie uma pergunta ou comando para a IA.');
  const history = Array.isArray(options.history) ? options.history.slice(-20) : [];
  const messages = [{ role: 'system', content: CHAT_SYSTEM_PROMPT }];
  const fileContext = await collectReferencedFileContext(text);
  if (fileContext) messages.push({ role: 'system', content: `Conteúdo atual dos arquivos mencionados:\n${fileContext}` });
  const historyStart = messages.length;
  for (const item of history) messages.push({ role: item.role, content: item.text });
  for (let index = 0; index < history.length; index += 1) {
    const item = history[index];
    const attachmentContent = buildAttachmentContext(item.attachments, options.providerId);
    if (!attachmentContent.length) continue;
    const target = messages[historyStart + index];
    target.content = options.providerId === 'openai'
      ? [{ type: 'input_text', text: String(item.text || '') }, ...attachmentContent]
      : [String(item.text || ''), ...attachmentContent.map((entry) => entry.text || `[Imagem: ${item.attachments?.[0]?.name || 'anexo'}]`)].join('\n\n');
  }
  if (!history.length || history.at(-1)?.text !== text) messages.push({ role: 'user', content: text });
  return messages;
}

async function finalizeAiResponse(content) {
  const response = parseAgentResponse(content);
  const results = await executeFileActions(response.actions);
  return `${response.message || 'Operação concluída.'}${results.length ? `\n\n${results.join('\n')}` : ''}`;
}

async function reply(message, options = {}) {
  const capabilities = await aiManagerService.getCapabilities();
  const messages = await buildAiMessages(message, { ...options, providerId: capabilities.providerId });
  const generated = await aiManagerService.generateFor('chat', messages, { maxCompletionTokens: 4096, timeoutMs: 60000, signal: options.signal });
  const text = await finalizeAiResponse(generated.content);
  return options.returnDetails ? { text, provider: generated.providerId, model: generated.model } : text;
}

async function streamReply(message, options = {}) {
  const capabilities = await aiManagerService.getCapabilities();
  const messages = await buildAiMessages(message, { ...options, providerId: capabilities.providerId });
  let content = '';
  for await (const delta of aiManagerService.streamFor('chat', messages, { maxCompletionTokens: 4096, timeoutMs: 60000, signal: options.signal })) {
    content += delta;
    if (options.onDelta) await options.onDelta(delta);
  }
  const text = await finalizeAiResponse(content);
  return options.returnDetails ? { text, provider: capabilities.providerId, model: capabilities.model } : text;
}

module.exports = {
  listConversations,
  createConversation,
  loadConversation,
  saveConversation,
  deleteConversation,
  renameConversation,
  duplicateConversation,
  setConversationPinned,
  clearConversation,
  clearAllConversations,
  prepareConversationShare,
  appendMessage,
  updateMessage,
  deleteMessage,
  prepareRegeneration,
  exportConversation,
  serializeConversation,
  importConversation,
  parseAgentResponse,
  executeFileActions,
  collectReferencedFileContext,
  buildAttachmentContext,
  buildAiMessages,
  finalizeAiResponse,
  streamReply,
  reply,
};
