# Como deixar a Locadora rodando

Requisitos: MySQL Server e MongoDB instalados (guia no final deste arquivo).

## 1. Criar o banco e as tabelas

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS locadora_db;"
mysql -u root -p locadora_db < sql/schema.sql
```

O `sql/schema.sql` cria as tabelas do sistema:

| Tabela | Para que serve |
| --- | --- |
| `veiculos` | frota da locadora |
| `pessoas` | quem pode entrar (senha em hash Bcrypt) |
| `pessoa_documentos` | CPF/CNPJ do cadastro (o login é por e-mail) |
| `pessoa_contatos` | e-mail da pessoa |
| `funcionarios` | cargo e nível de permissão de quem acessa o sistema |

Ele também cadastra 3 veículos de exemplo **somente se** a tabela `veiculos` estiver vazia,
então pode ser executado de novo sem duplicar dados.

## 2. Instalar as dependências

```bash
cd locadora
npm install
```

## 3. Criar o primeiro usuário de acesso

Quem usa o sistema é um **funcionário**. Crie o primeiro login pelo terminal:

```bash
npm run criar-usuario -- "Maria Souza" 12345678909 senha123 "Administrador" maria@locacar.com
```

Ordem dos dados: `"Nome" DOCUMENTO SENHA "Cargo" EMAIL`.

- `DOCUMENTO`: CPF (11 dígitos) ou CNPJ (14 dígitos), só números.
- `SENHA`: mínimo de 6 caracteres — é gravada apenas como hash Bcrypt.
- `CARGO`: Atendente, Gerente, Mecânico, Financeiro ou Administrador. O cargo
  define a permissão: **somente Administrador** cadastra, altera e exclui
  funcionários. O nível é derivado do cargo (Administrador = 3, Gerente = 2,
  demais = 1).
- `EMAIL`: obrigatório e único — é o login do usuário.

O script avisa se o documento já estiver cadastrado. Novos funcionários usam o mesmo comando.

## 4. Subir a locadora

```bash
node server.js
```

Esperado no terminal:

```
MongoDB conectado com sucesso!
Servidor rodando com sucesso no endereço: http://localhost:3001
```

Abra no navegador: http://localhost:3001 — sem sessão ativa você é levado para
http://localhost:3001/login.html.

Login: e-mail `maria@locacar.com` e senha `senha123` (os do passo 3).
A sessão dura 8 horas e o cookie é `httpOnly`.

### Cadastro e gestão de funcionários

Existem **dois jeitos** de cadastrar um funcionário neste projeto acadêmico:

1. **Cadastro aberto (`POST /auth/cadastro`)** — qualquer pessoa acessa
   `http://localhost:3001/cadastro`, preenche nome, documento, e-mail
   (obrigatório, usado no login), senha e confirmação. O sistema cria sempre um **Atendente** (nível 1), registra o
   cadastro e **abre a sessão** automaticamente. Se o documento já estiver
   cadastrado, responde 409 e não cria nada. A tela de cadastro é uma página
   exclusiva; depois de concluir, o usuário é levado ao dashboard.

2. **Gestão de funcionários (`/funcionarios`)** — após entrar, o menu
   **Funcionários** lista todos os cadastros. A tela mostra apenas a lista; a
   edição abre em uma janela sobre ela, para o formulário não ocupar o espaço
   dos registros. Somente o cargo **Administrador** pode cadastrar, editar e
   excluir funcionários. O CPF/CNPJ **não pode ser alterado**; o e-mail é usado
   no login e pode ser alterado, desde que não pertença a outro cadastro.

Quem já está logado como Administrador e abre `/cadastro` cadastra um novo
funcionário sem trocar a própria sessão, podendo escolher o cargo — inclusive
criar outro **Administrador**. Os demais cargos veem a tela como restrita. O
cadastro público sempre cria um Atendente.

Os cadastros geram logs no MongoDB (`CRIAR_FUNCIONARIO`, `ATUALIZAR_FUNCIONARIO`,
`DELETAR_FUNCIONARIO`), que aparecem na tela de Auditoria.

## 5. Testar a API (em outro terminal)

O sistema tem o cadastro público (`POST /auth/cadastro`) e a gestão de
funcionários (`/funcionarios`): listar, editar e excluir.

As páginas internas (`/index.html`, `/funcionarios.html` e `/logs.html`) são
protegidas no servidor pelo middleware `exigirLoginPagina`; a API (`/veiculos`,
`/funcionarios` e `/logs`) responde **401** sem sessão.

Com o login, o `curl` precisa guardar o cookie de sessão (`-c` grava, `-b` envia):

```bash
# login (guarda o cookie em cookies.txt)
curl -c cookies.txt -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@locacar.com","senha":"senha123"}'

curl -b cookies.txt http://localhost:3001/auth/me   # mostra o usuário logado
curl -b cookies.txt http://localhost:3001/veiculos  # lista a frota

curl -b cookies.txt -X POST http://localhost:3001/veiculos \
  -H "Content-Type: application/json" \
  -d '{"modelo":"HB20","marca":"Hyundai","placa":"JKL1M23","preco_diaria":110.00,"status":"Disponível"}'

curl -b cookies.txt http://localhost:3001/logs      # deve mostrar CRIAR_VEICULO + LOGIN

curl -b cookies.txt -X POST http://localhost:3001/auth/logout
```

Sem cookie, `/veiculos` e `/logs` respondem **401** (`{"mensagem":"Faça login para continuar."}`).

Se aparecer erro 500 em `/veiculos`, o MySQL não está rodando:
```bash
sudo systemctl start mysql
```

Se aparecer erro 500 em `/logs`, o MongoDB não está rodando:
```bash
sudo systemctl start mongod
```

## Estrutura do projeto

```
locadora/
├── config/         conexões MySQL (pool) e MongoDB (Mongoose)
├── models/         acesso a dados (SQL e schemas)
├── controllers/    recebem a requisição, validam e orquestram
├── routes/         mapeiam URL + método para o controller
├── middlewares/    autenticação de API e de páginas
├── services/       regras compartilhadas (auditoria, sessão)
├── scripts/        utilitários de linha de comando
├── sql/            schema do MySQL
└── frontend/       páginas HTML, css/ e js/ (módulos ES)
```

Cada camada tem uma responsabilidade:

- `models/`: única camada que fala SQL/Mongoose; não conhece `req`/`res`.
- `controllers/`: valida a entrada e monta a resposta HTTP.
- `routes/`: liga método + URL ao controller e aplica middlewares.
- `middlewares/`: assuntos transversais da requisição (autenticação).
- `services/`: regras reutilizadas por mais de um controller (auditoria, sessão).
- `services/`: regras reutilizadas por mais de um controller (auditoria, sessão, permissão).
- `scripts/`: comandos de terminal, fora do fluxo da aplicação.

---

## Anexo — Instalar os bancos (se ainda não estiverem instalados)

### MySQL Server (senha `root1234`, igual ao `.env`)

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql    # entra sem senha
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root1234';
EXIT;
```

### MongoDB

```bash
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

> **Aviso:** se o `mongod` não subir com erro de incompatibilidade de kernel
> (SERVER-121912, kernels 6.19+), use o Plano B do projeto loja:
> `sudo docker run -d --name mongod-loca -p 27017:27017 mongo:8`

### Segredo da sessão (opcional, recomendado)

Por padrão o projeto usa um segredo de desenvolvimento. Para definir o seu,
acrescente uma linha no `locadora/.env`:

```
SESSION_SECRET=uma-frase-longa-e-dificil-de-adivinhar
```
