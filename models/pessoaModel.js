const db = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

class PessoaModel {
  // Cria a pessoa no MySQL com a senha criptografada por Bcrypt.
  // Tudo acontece em uma transação: se algum INSERT falhar, nada é gravado.
  static async createPessoaCompleta(data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);

      const [resPessoa] = await conn.query(
        `INSERT INTO pessoas (nome_razao_social, nome_fantasia_apelido, senha, ativo)
         VALUES (?, ?, ?, TRUE)`,
        [data.nome_razao_social, data.nome_fantasia_apelido || null, senhaHash]
      );
      const pessoaId = resPessoa.insertId;

      await conn.query(
        `INSERT INTO pessoa_documentos (pessoa_id, tipo_documento_id, numero) VALUES (?, ?, ?)`,
        [pessoaId, data.tipo_documento_id || 1, data.documento_numero]
      );

      if (data.email) {
        await conn.query(
          `INSERT INTO pessoa_contatos (pessoa_id, tipo, valor, principal) VALUES (?, 'email', ?, TRUE)`,
          [pessoaId, data.email]
        );
      }

      await conn.commit();
      return pessoaId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Busca a pessoa pelo documento (usado na autenticação); traz o hash da senha
  static async findByDocumento(documento) {
    const [rows] = await db.query(
      `SELECT p.id, p.nome_razao_social, p.senha, p.ativo, pc.valor AS email
       FROM pessoas p
       JOIN pessoa_documentos pd ON p.id = pd.pessoa_id
       LEFT JOIN pessoa_contatos pc ON p.id = pc.pessoa_id AND pc.tipo = 'email' AND pc.principal = TRUE
       WHERE pd.numero = ? AND p.ativo = TRUE`,
      [documento]
    );
    return rows[0] || null;
  }

  // Busca a pessoa pelo e-mail principal (usado na autenticação); traz o hash da senha
  static async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT p.id, p.nome_razao_social, p.senha, p.ativo, pc.valor AS email
       FROM pessoas p
       JOIN pessoa_contatos pc ON p.id = pc.pessoa_id AND pc.tipo = 'email' AND pc.principal = TRUE
       WHERE LOWER(pc.valor) = ? AND p.ativo = TRUE`,
      [String(email || '').trim().toLowerCase()]
    );
    return rows[0] || null;
  }

  // Verifica se o e-mail já pertence a outra pessoa (login precisa ser único)
  static async emailEmUso(email, ignorarPessoaId = null) {
    const parametros = [String(email || '').trim().toLowerCase()];
    let sql = `SELECT pessoa_id FROM pessoa_contatos WHERE tipo = 'email' AND LOWER(valor) = ?`;

    if (ignorarPessoaId) {
      sql += ' AND pessoa_id <> ?';
      parametros.push(ignorarPessoaId);
    }

    const [rows] = await db.query(`${sql} LIMIT 1`, parametros);
    return rows.length > 0;
  }

  // Retorna a pessoa por id com o e-mail e o documento
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT p.id, p.nome_razao_social, pc.valor AS email, pd.numero AS documento
       FROM pessoas p
       LEFT JOIN pessoa_contatos pc ON p.id = pc.pessoa_id AND pc.tipo = 'email' AND pc.principal = TRUE
       LEFT JOIN pessoa_documentos pd ON p.id = pd.pessoa_id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // Atualiza nome, e-mail, senha e/ou perfil de funcionário
  static async atualizar(id, dados) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const campos = [];
      const valores = [];

      if (dados.nome_razao_social !== undefined) {
        campos.push('nome_razao_social = ?');
        valores.push(dados.nome_razao_social);
      }
      if (dados.senha) {
        const senhaHash = await bcrypt.hash(dados.senha, SALT_ROUNDS);
        campos.push('senha = ?');
        valores.push(senhaHash);
      }

      if (campos.length > 0) {
        valores.push(id);
        await conn.query(`UPDATE pessoas SET ${campos.join(', ')} WHERE id = ?`, valores);
      }

      // O e-mail fica em pessoa_contatos: atualiza, insere ou remove o principal
      if (dados.email !== undefined) {
        const [contatos] = await conn.query(
          `SELECT id FROM pessoa_contatos WHERE pessoa_id = ? AND tipo = 'email' AND principal = TRUE LIMIT 1`,
          [id]
        );

        if (dados.email) {
          if (contatos.length > 0) {
            await conn.query('UPDATE pessoa_contatos SET valor = ? WHERE id = ?', [dados.email, contatos[0].id]);
          } else {
            await conn.query(
              `INSERT INTO pessoa_contatos (pessoa_id, tipo, valor, principal) VALUES (?, 'email', ?, TRUE)`,
              [id, dados.email]
            );
          }
        } else {
          await conn.query(`DELETE FROM pessoa_contatos WHERE pessoa_id = ? AND tipo = 'email'`, [id]);
        }
      }

      // Atualiza o perfil do funcionário apenas quando o controller permitir
      if (dados.nome_cargo !== undefined || dados.nivel_permissao_acesso !== undefined) {
        const [resFuncionario] = await conn.query(
          `UPDATE funcionarios SET nome_cargo = COALESCE(?, nome_cargo),
                                     nivel_permissao_acesso = COALESCE(?, nivel_permissao_acesso),
                                     pode_cadastrar = COALESCE(?, pode_cadastrar)
           WHERE pessoa_id = ?`,
          [dados.nome_cargo, dados.nivel_permissao_acesso, dados.pode_cadastrar, id]
        );
        if (resFuncionario.affectedRows === 0) {
          throw new Error('Este usuário não tem perfil de funcionário.');
        }
      }

      await conn.commit();
      return id;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // Desativa a pessoa (mantém o histórico de auditoria)
  static async excluir(id) {
    const [res] = await db.query('UPDATE pessoas SET ativo = FALSE WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }
}

module.exports = PessoaModel;
