const LoggerService = require('../services/loggerService');
const PessoaModel = require('../models/pessoaModel');
const FuncionarioModel = require('../models/funcionarioModel');
const { montarUsuarioSessao } = require('../services/sessaoService');
const { CARGOS, nivelDoCargo, ehAdministrador } = require('../services/permissaoService');
const { normalizarEmail, emailValido } = require('../services/emailService');

function limparDocumento(documento) {
  return String(documento || '').replace(/\D/g, '');
}

// Regras de cadastro compartilhadas por registrar() e criar()
function validarCadastro({ nome, documento, email, senha, confirmarSenha }) {
  if (!nome || !documento || !email || !senha || !confirmarSenha) {
    return 'Informe nome, documento, e-mail, senha e confirmação.';
  }
  if (!emailValido(email)) {
    return 'Informe um e-mail válido; ele será usado no login.';
  }
  if (senha !== confirmarSenha) {
    return 'A senha e a confirmação são diferentes.';
  }
  if (senha.length < 6) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  const docLimpo = limparDocumento(documento);
  if (docLimpo.length !== 11 && docLimpo.length !== 14) {
    return 'O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
  }

  return null;
}

class FuncionarioController {
  // Cadastro público: sempre cria um Atendente (sem permissão de gestão).
  // Quem promove o cargo é o Administrador, pela edição do cadastro.
  static async registrar(req, res) {
    try {
      const { nome, documento, email, senha, confirmarSenha } = req.body;

      const erroValidacao = validarCadastro({ nome, documento, email, senha, confirmarSenha });
      if (erroValidacao) {
        return res.status(400).json({ mensagem: erroValidacao });
      }

      const docLimpo = limparDocumento(documento);
      const emailNormalizado = normalizarEmail(email);

      const pessoaExistente = await PessoaModel.findByDocumento(docLimpo);
      if (pessoaExistente) {
        return res.status(409).json({ mensagem: 'Já existe um cadastro com esse documento.' });
      }

      if (await PessoaModel.emailEmUso(emailNormalizado)) {
        return res.status(409).json({ mensagem: 'Já existe um cadastro com esse e-mail.' });
      }

      const cargo = 'Atendente';
      const nivel = nivelDoCargo(cargo);

      const pessoaId = await PessoaModel.createPessoaCompleta({
        nome_razao_social: nome.trim(),
        documento_numero: docLimpo,
        tipo_documento_id: docLimpo.length > 11 ? 2 : 1,
        email: emailNormalizado,
        senha
      });

      const funcionarioId = await FuncionarioModel.createFuncionario(pessoaId, cargo, nivel, false);

      req.session.usuario = montarUsuarioSessao(
        { id: pessoaId, nome_razao_social: nome.trim(), email: emailNormalizado },
        {
          id: funcionarioId,
          nome_cargo: cargo,
          nivel_permissao_acesso: nivel,
          pode_cadastrar: 0
        }
      );

      await LoggerService.registrarLog(req, 'CRIAR_FUNCIONARIO', '/auth/cadastro', {
        resultado: 'SUCESSO',
        pessoa_id: pessoaId,
        nome: nome.trim(),
        documento: docLimpo,
        email: emailNormalizado,
        cargo,
        nivel_permissao: nivel
      });

      res.status(201).json({
        usuario: req.session.usuario,
        mensagem: 'Cadastro criado e sessão aberta. Bem-vindo ao sistema!'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro interno ao criar o cadastro.' });
    }
  }

  // Cadastro feito por um Administrador: pode criar outro Administrador
  static async criar(req, res) {
    try {
      const { nome, documento, email, senha, confirmarSenha, cargo } = req.body;

      const erroValidacao = validarCadastro({ nome, documento, email, senha, confirmarSenha });
      if (erroValidacao) {
        return res.status(400).json({ mensagem: erroValidacao });
      }
      if (!CARGOS.includes(cargo)) {
        return res.status(400).json({ mensagem: `Cargo inválido. Opções: ${CARGOS.join(', ')}.` });
      }

      const docLimpo = limparDocumento(documento);
      const emailNormalizado = normalizarEmail(email);

      const pessoaExistente = await PessoaModel.findByDocumento(docLimpo);
      if (pessoaExistente) {
        return res.status(409).json({ mensagem: 'Já existe um cadastro com esse documento.' });
      }

      if (await PessoaModel.emailEmUso(emailNormalizado)) {
        return res.status(409).json({ mensagem: 'Já existe um cadastro com esse e-mail.' });
      }

      const nivel = nivelDoCargo(cargo);

      const pessoaId = await PessoaModel.createPessoaCompleta({
        nome_razao_social: nome.trim(),
        documento_numero: docLimpo,
        tipo_documento_id: docLimpo.length > 11 ? 2 : 1,
        email: emailNormalizado,
        senha
      });

      await FuncionarioModel.createFuncionario(pessoaId, cargo, nivel, ehAdministrador(cargo));

      await LoggerService.registrarLog(req, 'CRIAR_FUNCIONARIO', '/funcionarios', {
        resultado: 'SUCESSO',
        pessoa_id: pessoaId,
        nome: nome.trim(),
        documento: docLimpo,
        email: emailNormalizado,
        cargo,
        nivel_permissao: nivel
      });

      res.status(201).json({ mensagem: 'Funcionário cadastrado com sucesso.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro interno ao criar o funcionário.' });
    }
  }

  // Listagem de todos os funcionários ativos (qualquer usuário autenticado)
  static async listar(req, res) {
    try {
      const funcionarios = await FuncionarioModel.listarTodos();
      res.status(200).json(funcionarios);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro ao listar os funcionários.' });
    }
  }

  // Somente Administrador chega aqui (middleware). Pode alterar qualquer cadastro,
  // inclusive o próprio, e o nível é sempre recalculado a partir do cargo.
  static async atualizar(req, res) {
    try {
      const pessoaId = Number(req.params.id);
      const { nome, email, senha, cargo } = req.body;

      if (senha !== undefined && senha !== '' && senha.length < 6) {
        return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 6 caracteres.' });
      }
      if (cargo !== undefined && !CARGOS.includes(cargo)) {
        return res.status(400).json({ mensagem: `Cargo inválido. Opções: ${CARGOS.join(', ')}.` });
      }

      const dados = {};
      if (nome !== undefined) dados.nome_razao_social = nome.trim();
      if (senha) dados.senha = senha;

      if (email !== undefined) {
        const emailNormalizado = normalizarEmail(email);
        if (!emailNormalizado) {
          return res.status(400).json({ mensagem: 'Informe o e-mail de acesso.' });
        }
        if (!emailValido(emailNormalizado)) {
          return res.status(400).json({ mensagem: 'Informe um e-mail válido; ele é usado no login.' });
        }
        if (await PessoaModel.emailEmUso(emailNormalizado, pessoaId)) {
          return res.status(409).json({ mensagem: 'Já existe um cadastro com esse e-mail.' });
        }
        dados.email = emailNormalizado;
      }

      if (cargo !== undefined) {
        dados.nome_cargo = cargo;
        dados.nivel_permissao_acesso = nivelDoCargo(cargo);
        dados.pode_cadastrar = ehAdministrador(cargo);
      }

      if (Object.keys(dados).length === 0) {
        return res.status(400).json({ mensagem: 'Nenhum campo para atualizar.' });
      }

      const pessoa = await PessoaModel.findById(pessoaId);
      if (!pessoa) {
        return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
      }

      await PessoaModel.atualizar(pessoaId, dados);

      // Se o Administrador editou o próprio cadastro, a sessão acompanha os novos dados
      if (req.session.usuario.pessoa_id === pessoaId) {
        const pessoaAtualizada = await PessoaModel.findById(pessoaId);
        const funcionario = await FuncionarioModel.findByPessoaId(pessoaId);
        req.session.usuario = montarUsuarioSessao(pessoaAtualizada, funcionario);
      }

      await LoggerService.registrarLog(req, 'ATUALIZAR_FUNCIONARIO', '/funcionarios', {
        resultado: 'SUCESSO',
        pessoa_id: pessoaId,
        nome: dados.nome_razao_social || pessoa.nome_razao_social,
        email: dados.email === undefined ? pessoa.email : dados.email,
        cargo: dados.nome_cargo || null
      });

      res.status(200).json({ mensagem: 'Cadastro atualizado com sucesso.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro interno ao atualizar o cadastro.' });
    }
  }

  // Somente Administrador chega aqui (middleware) e nunca exclui a si mesmo
  static async excluir(req, res) {
    try {
      const pessoaId = Number(req.params.id);

      if (req.session.usuario.pessoa_id === pessoaId) {
        return res.status(400).json({ mensagem: 'Não é possível excluir o próprio usuário logado.' });
      }

      const pessoa = await PessoaModel.findById(pessoaId);
      if (!pessoa) {
        return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
      }

      await PessoaModel.excluir(pessoaId);

      await LoggerService.registrarLog(req, 'DELETAR_FUNCIONARIO', '/funcionarios', {
        resultado: 'SUCESSO',
        pessoa_id: pessoaId,
        nome: pessoa.nome_razao_social,
        documento: pessoa.documento,
        email: pessoa.email
      });

      res.status(200).json({ mensagem: 'Cadastro excluído com sucesso.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensagem: 'Erro interno ao excluir o cadastro.' });
    }
  }
}

module.exports = FuncionarioController;
