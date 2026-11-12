const bcrypt = require('bcrypt');
const PessoaModel = require('../models/pessoaModel');
const FuncionarioModel = require('../models/funcionarioModel');
const LoggerService = require('../services/loggerService');
const { montarUsuarioSessao } = require('../services/sessaoService');
const { normalizarEmail } = require('../services/emailService');

class AuthController {
  // Autenticação por e-mail + senha, com comparação Bcrypt e log no MongoDB
  static async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Informe e-mail e senha.' });
      }

      const emailNormalizado = normalizarEmail(email);
      const pessoa = await PessoaModel.findByEmail(emailNormalizado);

      if (!pessoa) {
        await LoggerService.registrarLog(req, 'LOGIN', '/auth/login', {
          resultado: 'FALHA_EMAIL_NAO_ENCONTRADO',
          email: emailNormalizado
        });
        return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
      }

      const senhaValida = await bcrypt.compare(senha, pessoa.senha);
      if (!senhaValida) {
        await LoggerService.registrarLog(req, 'LOGIN', '/auth/login', {
          resultado: 'FALHA_SENHA_INCORRETA',
          pessoa_id: pessoa.id,
          email: emailNormalizado
        });
        return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
      }

      // Na locadora só funcionários acessam a gestão da frota
      const funcionario = await FuncionarioModel.findByPessoaId(pessoa.id);
      if (!funcionario) {
        await LoggerService.registrarLog(req, 'LOGIN', '/auth/login', {
          resultado: 'FALHA_SEM_PERFIL_FUNCIONARIO',
          pessoa_id: pessoa.id,
          email: emailNormalizado
        });
        return res.status(403).json({ mensagem: 'Este usuário não tem perfil de funcionário da locadora.' });
      }

      req.session.usuario = montarUsuarioSessao(pessoa, funcionario);

      await LoggerService.registrarLog(req, 'LOGIN', '/auth/login', {
        resultado: 'SUCESSO',
        pessoa_id: pessoa.id,
        nome: pessoa.nome_razao_social,
        email: emailNormalizado,
        tipo_usuario: 'funcionario',
        cargo: funcionario.nome_cargo
      });

      res.status(200).json({ usuario: req.session.usuario });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro interno durante a autenticação.' });
    }
  }

  static async logout(req, res) {
    if (req.session.usuario) {
      await LoggerService.registrarLog(req, 'LOGOUT', '/auth/logout', {
        pessoa_id: req.session.usuario.pessoa_id,
        nome: req.session.usuario.nome,
        email: req.session.usuario.email,
        mensagem: 'Sessão encerrada pelo usuário'
      });
    }

    req.session.destroy(() => {
      res.clearCookie('locadora.sid');
      res.status(200).json({ mensagem: 'Sessão encerrada.' });
    });
  }

  // Usada pelo frontend para saber quem está logado e montar a topbar
  static async sessao(req, res) {
    if (!req.session.usuario) {
      return res.status(401).json({ mensagem: 'Não autenticado.' });
    }
    res.status(200).json({ usuario: req.session.usuario });
  }
}

module.exports = AuthController;
