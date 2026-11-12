const db = require('../config/database');

class FuncionarioModel {
  // Vincula uma pessoa já cadastrada a um perfil de funcionário da locadora
  static async createFuncionario(pessoaId, nomeCargo, nivelPermissao = 1, podeCadastrar = true) {
    const [resultado] = await db.query(
      `INSERT INTO funcionarios (pessoa_id, nome_cargo, nivel_permissao_acesso, pode_cadastrar)
       VALUES (?, ?, ?, ?)`,
      [pessoaId, nomeCargo, nivelPermissao, podeCadastrar]
    );
    return resultado.insertId;
  }

  static async findByPessoaId(pessoaId) {
    const [rows] = await db.query(
      `SELECT id, pessoa_id, nome_cargo, nivel_permissao_acesso, pode_cadastrar
       FROM funcionarios WHERE pessoa_id = ?`,
      [pessoaId]
    );
    return rows[0] || null;
  }

  // Lista todos os funcionários ativos (nome + documento + e-mail)
  static async listarTodos() {
    const [rows] = await db.query(
      `SELECT p.id AS pessoa_id, p.nome_razao_social, p.ativo,
              pd.numero AS documento, pc.valor AS email,
              f.nome_cargo, f.nivel_permissao_acesso, f.pode_cadastrar, f.criado_em
       FROM pessoas p
       JOIN funcionarios f ON p.id = f.pessoa_id
       LEFT JOIN pessoa_documentos pd ON p.id = pd.pessoa_id
       LEFT JOIN pessoa_contatos pc ON p.id = pc.pessoa_id AND pc.tipo = 'email' AND pc.principal = TRUE
       WHERE p.ativo = TRUE
       ORDER BY p.id ASC`,
      []
    );
    return rows;
  }
}

module.exports = FuncionarioModel;
