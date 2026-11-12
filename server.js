require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { exigirLoginPagina } = require('./middlewares/auth');

const app = express();

app.use(express.json());

app.use(session({
  name: 'locadora.sid',
  secret: process.env.SESSION_SECRET || 'locadora-dev-secret-troque-no-env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

require('./config/mongo')();

const FRONTEND_DIR = path.resolve(__dirname, 'frontend');
const pagina = (arquivo) => (req, res) => res.sendFile(arquivo, { root: FRONTEND_DIR });

// ---------- Páginas ----------
app.get('/', (req, res) => {
  res.redirect(req.session.usuario ? '/index.html' : '/login.html');
});

// Páginas públicas
app.get('/login', pagina('login.html'));
app.get('/cadastro', pagina('cadastro.html'));

// Páginas internas (protegidas no servidor, antes do express.static)
app.get('/index.html', exigirLoginPagina, pagina('index.html'));
app.get('/funcionarios.html', exigirLoginPagina, pagina('funcionarios.html'));
app.get('/logs.html', exigirLoginPagina, pagina('logs.html'));

// CSS, JS e imagens do frontend
app.use(express.static(FRONTEND_DIR, { index: false }));

// ---------- API ----------
app.use('/auth', require('./routes/authRoutes'));
app.use('/funcionarios', require('./routes/funcionarioRoutes'));
app.use('/veiculos', require('./routes/veiculoRoutes'));
app.use('/logs', require('./routes/logRoutes'));

// ---------- 404 ----------
app.use((req, res) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/funcionarios') ||
      req.path.startsWith('/veiculos') || req.path.startsWith('/logs')) {
    return res.status(404).json({ mensagem: 'Recurso não encontrado.' });
  }
  res.status(404).sendFile('login.html', { root: FRONTEND_DIR });
});

const PORTA = process.env.PORTA || 3001;
app.listen(PORTA, () => {
  console.log(`Servidor rodando com sucesso no endereço: http://localhost:${PORTA}`);
});
