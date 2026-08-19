const chatService = require('../services/chatService');

exports.listConversations = async (req, res) => {
  try {
    const result = await chatService.listConversations({ paginated: true, page: req.query.page, limit: req.query.limit, search: req.query.search });
    res.json({ success: true, conversations: result.items, pagination: result.pagination });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.createConversation = async (req, res) => {
  try {
    const conversation = await chatService.createConversation(req.body);
    res.status(201).json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.renameConversation = async (req, res) => {
  try {
    const { name } = req.body;
    const conversation = await chatService.renameConversation(req.params.id, name);
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    await chatService.deleteConversation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteAllConversations = async (req, res) => {
  try {
    const deleted = await chatService.clearAllConversations();
    res.json({ success: true, deleted });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.duplicateConversation = async (req, res) => {
  try {
    const conversation = await chatService.duplicateConversation(req.params.id);
    res.status(201).json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.pinConversation = async (req, res) => {
  try {
    const conversation = await chatService.setConversationPinned(req.params.id, req.body?.pinned);
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.clearConversation = async (req, res) => {
  try {
    const conversation = await chatService.clearConversation(req.params.id);
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.shareConversation = async (req, res) => {
  try {
    const share = await chatService.prepareConversationShare(req.params.id);
    res.json({ success: true, share });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.loadConversation = async (req, res) => {
  try {
    const conversation = await chatService.loadConversation(req.params.id, { paginated: true, page: req.query.messagePage, limit: req.query.messageLimit });
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
};

exports.exportConversation = async (req, res) => {
  try {
    const conversation = await chatService.exportConversation(req.params.id);
    const format = String(req.query.format || 'json').toLowerCase();
    if (req.query.download === '1') {
      const exported = chatService.serializeConversation(conversation, format);
      res.setHeader('Content-Type', `${exported.contentType}; charset=utf-8`);
      res.setHeader('Content-Disposition', `attachment; filename="conversation.${exported.extension}"`);
      res.send(exported.content);
      return;
    }
    res.json({ success: true, conversation, exported: chatService.serializeConversation(conversation, format) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    const message = await chatService.updateMessage(req.params.id, req.params.messageId, req.body || {});
    res.json({ success: true, message });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    await chatService.deleteMessage(req.params.id, req.params.messageId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.importConversation = async (req, res) => {
  try {
    const { conversation } = req.body;
    const imported = await chatService.importConversation(conversation);
    res.status(201).json({ success: true, conversation: imported });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, message, attachments } = req.body;
    if (!conversationId) {
      throw new Error('Identificador da conversa é obrigatório.');
    }
    await chatService.appendMessage(conversationId, { role: 'user', text: message, attachments });
    const conversation = await chatService.loadConversation(conversationId);
    const generated = await chatService.reply(message, { history: conversation.messages, returnDetails: true });
    const assistantMessage = await chatService.appendMessage(conversationId, { role: 'assistant', text: generated.text, attachments: [], provider: generated.provider, model: generated.model });
    res.json({ success: true, reply: generated.text, message: assistantMessage });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.streamMessage = async (req, res) => {
  const controller = new AbortController();
  let activeConversationId = null;
  const send = (event, payload) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  res.on('close', () => { if (!res.writableEnded) controller.abort(new Error('AI_CANCELLED')); });
  try {
    const { conversationId, message, attachments, regenerateMessageId } = req.body || {};
    if (!conversationId) throw new Error('Identificador da conversa é obrigatório.');
    activeConversationId = conversationId;
    let prompt = message;
    let userMessage = null;
    if (regenerateMessageId) {
      const regeneration = await chatService.prepareRegeneration(conversationId, regenerateMessageId);
      prompt = regeneration.prompt.text;
    } else {
      userMessage = await chatService.appendMessage(conversationId, { role: 'user', text: message, attachments });
    }
    const conversation = await chatService.loadConversation(conversationId);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    if (userMessage) send('accepted', { message: userMessage });
    const generated = await chatService.streamReply(prompt, {
      history: conversation.messages,
      signal: controller.signal,
      onDelta: (delta) => send('delta', { delta }),
      returnDetails: true,
    });
    const assistantMessage = await chatService.appendMessage(conversationId, { role: 'assistant', text: generated.text, attachments: [], provider: generated.provider, model: generated.model });
    send('complete', { reply: generated.text, message: assistantMessage });
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(error.code === 'AI_CANCELLED' ? 499 : 400).json({ success: false, error: error.message, code: error.code || 'AI_STREAM_ERROR' });
      return;
    }
    if (controller.signal.aborted && activeConversationId) {
      await chatService.appendMessage(activeConversationId, { role: 'assistant', text: 'Geração cancelada pelo usuário.', attachments: [] }).catch(() => {});
    }
    send('error', { error: error.message, code: error.code || (controller.signal.aborted ? 'AI_CANCELLED' : 'AI_STREAM_ERROR') });
    res.end();
  }
};
