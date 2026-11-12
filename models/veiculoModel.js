const db = require('../config/database');

class VeiculoModel {
  static async listarTodos() {
    const [linhas] = await db.query('SELECT * FROM veiculos ORDER BY id ASC');
    return linhas;
  }

  static async findById(id) {
    const [linhas] = await db.query('SELECT * FROM veiculos WHERE id = ?', [id]);
    return linhas[0] || null;
  }

  static async criar({ modelo, marca, placa, preco_diaria, status }) {
    const [resultado] = await db.query(
      `INSERT INTO veiculos (modelo, marca, placa, preco_diaria, status)
       VALUES (?, ?, ?, ?, ?)`,
      [modelo, marca, placa, preco_diaria, status]
    );

    return {
      id: resultado.insertId,
      modelo,
      marca,
      placa,
      preco_diaria,
      status
    };
  }

  static async atualizar(id, dados) {
    const campos = [];
    const valores = [];

    if (dados.preco_diaria !== undefined) {
      campos.push('preco_diaria = ?');
      valores.push(dados.preco_diaria);
    }
    if (dados.status !== undefined) {
      campos.push('status = ?');
      valores.push(dados.status);
    }

    valores.push(id);
    await db.query(`UPDATE veiculos SET ${campos.join(', ')} WHERE id = ?`, valores);

    return this.findById(id);
  }

  static async excluir(id) {
    const [resultado] = await db.query('DELETE FROM veiculos WHERE id = ?', [id]);
    return resultado.affectedRows > 0;
  }
}

module.exports = VeiculoModel;
