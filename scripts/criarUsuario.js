require('dotenv').config();
const db = require('../config/database');
const PessoaModel = require('../models/pessoaModel');
const FuncionarioModel = require('../models/funcionarioModel');
const { CARGOS, nivelDoCargo, ehAdministrador } = require('../services/permissaoService');
const { normalizarEmail, emailValido } = require('../services/emailService');

// Uso:
// node scripts/criarUsuario.js "Maria Souza" 12345678909 senha123 "Administrador" maria@locacar.com
// O e-mail é o login; o cargo define a permissão e o nível.

const [nome, documento, senha, cargo, email] = process.argv.slice(2);

function erro(mensagem) {
  console.error(`\n[erro] ${mensagem}\n`);
  console.error('Uso: node scripts/criarUsuario.js "Nome Completo" DOCUMENTO SENHA "Cargo" EMAIL');
  console.error(`  Cargo: ${CARGOS.join(', ')}`);
  console.error('  Administrador tem acesso total; os demais cargos não gerenciam funcionários.');
  process.exit(1);
}

(async () => {
  if (!nome || !documento || !senha) {
    erro('Informe nome, documento e senha.');
  }

  if (!cargo || !CARGOS.includes(cargo)) {
    erro(`Informe um cargo válido: ${CARGOS.join(', ')}.`);
  }

  if (!email) {
    erro('Informe o e-mail de acesso; ele é o login do usuário.');
  }

  if (['1', '2', '3'].includes(email)) {
    erro('O nível agora vem do cargo. Informe o e-mail no lugar do nível.');
  }

  if (!emailValido(email)) {
    erro('Informe um e-mail válido.');
  }

  const docLimpo = documento.replace(/\D/g, '');
  if (docLimpo.length !== 11 && docLimpo.length !== 14) {
    erro('O documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).');
  }
  if (senha.length < 6) {
    erro('A senha deve ter pelo menos 6 caracteres.');
  }

  const emailNormalizado = normalizarEmail(email);
  const nivel = nivelDoCargo(cargo);
  const administrador = ehAdministrador(cargo);

  if (!administrador) {
    console.warn(`\n[aviso] Cargo "${cargo}": este usuário não cadastra, não exclui e não altera funcionários.\n`);
  }

  try {
    const existente = await PessoaModel.findByDocumento(docLimpo);
    if (existente) {
      erro(`Já existe um usuário ativo com o documento ${docLimpo}.`);
    }

    if (await PessoaModel.emailEmUso(emailNormalizado)) {
      erro(`Já existe um usuário com o e-mail ${emailNormalizado}.`);
    }

    const pessoaId = await PessoaModel.createPessoaCompleta({
      nome_razao_social: nome,
      tipo_documento_id: docLimpo.length > 11 ? 2 : 1,
      documento_numero: docLimpo,
      email: emailNormalizado,
      senha
    });

    const funcionarioId = await FuncionarioModel.createFuncionario(
      pessoaId,
      cargo,
      nivel,
      administrador
    );

    console.log('\nUsuário criado com sucesso!');
    console.log(`  Pessoa:      ${pessoaId}`);
    console.log(`  Funcionário: ${funcionarioId}`);
    console.log(`  Nome:        ${nome}`);
    console.log(`  Documento:   ${docLimpo}`);
    console.log(`  E-mail:      ${emailNormalizado}`);
    console.log(`  Cargo:       ${cargo} (nível ${nivel}${administrador ? ' - gestão' : ''})`);
    console.log('\nJá pode entrar em http://localhost:3001/login.html\n');
  } catch (error) {
    console.error('\nErro ao criar usuário:', error.message, '\n');
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
