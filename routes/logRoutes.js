const express = require('express');
const router = express.Router();

const LogController = require('../controllers/logController');
const { exigirLogin } = require('../middlewares/auth');

router.use(exigirLogin);

router.get('/', LogController.listar);

module.exports = router;
