const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  acao: { type: String, required: true },
  detalhes: { type: Object, required: true },
  dataCriacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
