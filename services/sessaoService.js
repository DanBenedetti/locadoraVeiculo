const { nivelDoCargo, ehAdministrador } = require('./permissaoService');

// Monta o objeto guardado em req.session.usuario.
// O cargo é a fonte da permissão; o nível é sempre derivado dele.
function montarUsuarioSessao(pessoa, funcionario) {
  const cargo = funcionario.nome_cargo;
  const administrador = ehAdministrador(cargo);

  return {
    pessoa_id: pessoa.id,
    funcionario_id: funcionario.id,
    nome: pessoa.nome_razao_social,
    email: pessoa.email || null,
    tipo: 'funcionario',
    cargo,
    nivelPermissao: nivelDoCargo(cargo),
    administrador,
    podeCadastrar: administrador
  };
}

module.exports = { montarUsuarioSessao };
