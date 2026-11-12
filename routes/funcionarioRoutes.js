const express = require('express');
const router = express.Router();

const FuncionarioController = require('../controllers/funcionarioController');
const { exigirLogin, exigirAdministrador } = require('../middlewares/auth');

router.use(exigirLogin);

// Qualquer funcionário autenticado consulta a lista
router.get('/', FuncionarioController.listar);

// Somente Administrador cadastra, altera ou exclui
router.post('/', exigirAdministrador, FuncionarioController.criar);
router.put('/:id', exigirAdministrador, FuncionarioController.atualizar);
router.delete('/:id', exigirAdministrador, FuncionarioController.excluir);

module.exports = router;
