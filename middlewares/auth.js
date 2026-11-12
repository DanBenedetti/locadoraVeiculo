const FuncionarioModel = require('../models/funcionarioModel');
const { ehAdministrador } = require('../services/permissaoService');

// Middleware de proteção de API: sem sessão, responde 401 em JSON
function exigirLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ mensagem: 'Faça login para continuar.' });
  }
  next();
}

// Middleware de proteção de páginas: sem sessão, redireciona para o login
function exigirLoginPagina(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect('/login.html');
  }
  next();
}

// Somente Administrador gerencia funcionários.
// Consulta o cargo atual no banco para a permissão não ficar presa na sessão.
async function exigirAdministrador(req, res, next) {
  try {
    const funcionario = await FuncionarioModel.findByPessoaId(req.session.usuario.pessoa_id);

    if (!funcionario || !ehAdministrador(funcionario.nome_cargo)) {
      return res.status(403).json({ mensagem: 'Apenas administradores podem gerenciar funcionários.' });
    }

    req.funcionarioLogado = funcionario;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensagem: 'Erro interno ao verificar permissão.' });
  }
}

module.exports = { exigirLogin, exigirLoginPagina, exigirAdministrador };
