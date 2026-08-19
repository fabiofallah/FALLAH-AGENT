const fileService = require('./services/fileService');
const explorerService = require('./services/explorerService');
const zipService = require('./services/zipService');
const terminalService = require('./services/terminalService');
const chatService = require('./services/chatService');
const { aiManagerService } = require('./services/aiManagerService');

module.exports = {
  fileService,
  explorerService,
  zipService,
  terminalService,
  chatService,
  aiService: aiManagerService,
};
