-- ============================================================
-- LocaCar - schema do MySQL (dados de frota e de acesso)
-- Uso: mysql -u root -p locadora_db < sql/schema.sql
-- ============================================================

-- ---------- Frota ----------
CREATE TABLE IF NOT EXISTS veiculos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(60) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    preco_diaria DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Disponível'
) ENGINE=InnoDB;

-- Frota de exemplo apenas se a tabela ainda estiver vazia
INSERT INTO veiculos (modelo, marca, placa, preco_diaria, status)
SELECT modelo, marca, placa, preco_diaria, status FROM (
    SELECT 'Corolla XEi' AS modelo, 'Toyota' AS marca, 'ABC1D23' AS placa, 150.00 AS preco_diaria, 'Disponível' AS status
    UNION ALL SELECT 'Onix LTZ', 'Chevrolet', 'DEF4E56', 120.00, 'Disponível'
    UNION ALL SELECT 'Renault Kwid', 'Renault', 'GHI7G89', 90.00, 'Manutenção'
) AS frota_inicial
WHERE NOT EXISTS (SELECT 1 FROM veiculos);

-- ---------- Pessoas (base do login) ----------
CREATE TABLE IF NOT EXISTS pessoas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_razao_social VARCHAR(150) NOT NULL,
    nome_fantasia_apelido VARCHAR(150) NULL,
    senha VARCHAR(255) NOT NULL, -- hash Bcrypt, nunca a senha em texto puro
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tipos_documento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(20) NOT NULL,
    UNIQUE KEY uk_tipo_documento_descricao (descricao)
) ENGINE=InnoDB;

INSERT IGNORE INTO tipos_documento (id, descricao) VALUES (1, 'CPF'), (2, 'CNPJ');

CREATE TABLE IF NOT EXISTS pessoa_documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pessoa_id INT NOT NULL,
    tipo_documento_id INT NOT NULL DEFAULT 1,
    numero VARCHAR(20) NOT NULL,
    UNIQUE KEY uk_pessoa_documento_numero (numero),
    CONSTRAINT fk_documento_pessoa FOREIGN KEY (pessoa_id) REFERENCES pessoas (id) ON DELETE CASCADE,
    CONSTRAINT fk_documento_tipo FOREIGN KEY (tipo_documento_id) REFERENCES tipos_documento (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pessoa_contatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pessoa_id INT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    valor VARCHAR(150) NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uk_contato_pessoa_tipo (pessoa_id, tipo),
    -- O e-mail é o login, então não pode se repetir entre pessoas
    UNIQUE KEY uk_contato_tipo_valor (tipo, valor),
    CONSTRAINT fk_contato_pessoa FOREIGN KEY (pessoa_id) REFERENCES pessoas (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Funcionários (quem pode entrar no sistema) ----------
-- O cargo define a permissão: Administrador = nível 3 (gestão),
-- Gerente = nível 2, demais cargos = nível 1. A aplicação recalcula o nível
-- sempre que o cargo é alterado.
CREATE TABLE IF NOT EXISTS funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pessoa_id INT NOT NULL,
    nome_cargo VARCHAR(60) NOT NULL,
    nivel_permissao_acesso INT NOT NULL DEFAULT 1,
    pode_cadastrar BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_funcionario_pessoa (pessoa_id),
    CONSTRAINT fk_funcionario_pessoa FOREIGN KEY (pessoa_id) REFERENCES pessoas (id) ON DELETE CASCADE
) ENGINE=InnoDB;
