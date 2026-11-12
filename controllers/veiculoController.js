const VeiculoModel = require('../models/veiculoModel');
const LoggerService = require('../services/loggerService');

const STATUS_VALIDOS = ['Disponível', 'Alugado', 'Manutenção'];

class VeiculoController {
  static async listar(req, res) {
    try {
      const veiculos = await VeiculoModel.listarTodos();
      res.status(200).json(veiculos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao buscar veículos.' });
    }
  }

  static async buscarPorId(req, res) {
    try {
      const veiculo = await VeiculoModel.findById(Number(req.params.id));
      if (!veiculo) {
        return res.status(404).json({ mensagem: 'Veículo não encontrado.' });
      }
      res.status(200).json(veiculo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao buscar veículo.' });
    }
  }

  static async criar(req, res) {
    const { modelo, marca, placa, preco_diaria, status } = req.body;

    if (!modelo || !marca || !placa || !preco_diaria) {
      return res.status(400).json({
        mensagem: "Os campos 'modelo', 'marca', 'placa' e 'preco_diaria' são obrigatórios."
      });
    }

    const statusFinal = status || 'Disponível';
    if (!STATUS_VALIDOS.includes(statusFinal)) {
      return res.status(400).json({ mensagem: 'Status inválido. Use: Disponível, Alugado ou Manutenção.' });
    }

    if (isNaN(Number(preco_diaria)) || Number(preco_diaria) <= 0) {
      return res.status(400).json({ mensagem: "'preco_diaria' deve ser um número maior que zero." });
    }

    try {
      const novoVeiculo = await VeiculoModel.criar({
        modelo,
        marca,
        placa,
        preco_diaria: Number(preco_diaria),
        status: statusFinal
      });

      await LoggerService.registrarLog(req, 'CRIAR_VEICULO', '/veiculos', novoVeiculo);

      res.status(201).json(novoVeiculo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao criar veículo.' });
    }
  }

  static async atualizar(req, res) {
    const id = Number(req.params.id);
    const { preco_diaria, status } = req.body;

    if (preco_diaria === undefined && status === undefined) {
      return res.status(400).json({ mensagem: "Informe 'preco_diaria' e/ou 'status' para atualização." });
    }

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ mensagem: 'Status inválido. Use: Disponível, Alugado ou Manutenção.' });
    }

    if (preco_diaria !== undefined && (isNaN(Number(preco_diaria)) || Number(preco_diaria) <= 0)) {
      return res.status(400).json({ mensagem: "'preco_diaria' deve ser um número maior que zero." });
    }

    try {
      const veiculoAnterior = await VeiculoModel.findById(id);
      if (!veiculoAnterior) {
        return res.status(404).json({ mensagem: 'Veículo não encontrado.' });
      }

      const veiculoAtualizado = await VeiculoModel.atualizar(id, {
        preco_diaria: preco_diaria === undefined ? undefined : Number(preco_diaria),
        status
      });

      await LoggerService.registrarLog(req, 'ATUALIZAR_VEICULO', '/veiculos', {
        id: veiculoAtualizado.id,
        modelo: veiculoAtualizado.modelo,
        placa: veiculoAtualizado.placa,
        preco_diaria: veiculoAtualizado.preco_diaria,
        status: veiculoAtualizado.status,
        antes: {
          preco_diaria: veiculoAnterior.preco_diaria,
          status: veiculoAnterior.status
        }
      });

      res.status(200).json(veiculoAtualizado);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao atualizar veículo.' });
    }
  }

  static async excluir(req, res) {
    const id = Number(req.params.id);

    try {
      const removido = await VeiculoModel.excluir(id);
      if (!removido) {
        return res.status(404).json({ mensagem: 'Veículo não encontrado para exclusão.' });
      }

      await LoggerService.registrarLog(req, 'DELETAR_VEICULO', '/veiculos', { idRemovido: id });

      res.status(200).json({ mensagem: 'Veículo removido com sucesso!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao deletar veículo.' });
    }
  }
}

module.exports = VeiculoController;
