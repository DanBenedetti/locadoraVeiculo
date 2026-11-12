// Normalização e validação de e-mail usadas no login e no cadastro
function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizarEmail(email));
}

module.exports = { normalizarEmail, emailValido };
