// Regra única de permissão do sistema:
// o CARGO define o nível e quem pode gerenciar funcionários.
const CARGOS = ['Atendente', 'Gerente', 'Mecânico', 'Financeiro', 'Administrador'];
const CARGO_ADMINISTRADOR = 'Administrador';

// Nível gravado no banco apenas para histórico/relatório; a permissão real é o cargo
const NIVEL_POR_CARGO = {
  Administrador: 3,
  Gerente: 2,
  Atendente: 1,
  'Mecânico': 1,
  Financeiro: 1
};

function nivelDoCargo(cargo) {
  return NIVEL_POR_CARGO[cargo] ?? 1;
}

function ehAdministrador(cargo) {
  return cargo === CARGO_ADMINISTRADOR;
}

module.exports = { CARGOS, CARGO_ADMINISTRADOR, nivelDoCargo, ehAdministrador };
