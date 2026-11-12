const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const FuncionarioController = require('../controllers/funcionarioController');

// Endpoints de autenticação e cadastro (a página /cadastro é servida pelo server.js)
router.post('/cadastro', FuncionarioController.registrar);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.sessao);

module.exports = router;
