const Log = require('../models/logModel');

// Centraliza o registro de auditoria no MongoDB, guardando também
// o IP e o navegador de quem executou a ação.
const LoggerService = {
  async registrarLog(req, acao, rota, detalhes = {}) {
    try {
      await Log.create({
        acao,
        detalhes: {
          ...detalhes,
          rota,
          ip: req.ip,
          user_agent: req.get('user-agent') || 'desconhecido'
        }
      });
    } catch (error) {
      // Falha de auditoria não pode derrubar a operação do usuário
      console.error('Erro ao registrar log de auditoria:', error.message);
    }
  }
};

module.exports = LoggerService;
