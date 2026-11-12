const express = require('express');
const router = express.Router();

const VeiculoController = require('../controllers/veiculoController');
const { exigirLogin } = require('../middlewares/auth');

router.use(exigirLogin);

router.get('/', VeiculoController.listar);
router.get('/:id', VeiculoController.buscarPorId);
router.post('/', VeiculoController.criar);
router.put('/:id', VeiculoController.atualizar);
router.delete('/:id', VeiculoController.excluir);

module.exports = router;
