const Log = require('../models/logModel');

class LogController {
  static async listar(req, res) {
    try {
      // Últimos 50 registros, do mais recente para o mais antigo
      const logs = await Log.find().sort({ dataCriacao: -1 }).limit(50);
      res.status(200).json(logs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao buscar logs.' });
    }
  }
}

module.exports = LogController;
