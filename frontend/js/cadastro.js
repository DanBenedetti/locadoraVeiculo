import { apiFetch } from './api.js';
import { buscarSessao } from './auth.js';

const formCadastro = document.getElementById('formCadastro');
const cadastroErro = document.getElementById('cadastroErro');
const btnCadastrar = document.getElementById('btnCadastrar');

const campoTitulo = document.getElementById('cadastroTitulo');
const campoCargo = document.getElementById('campoCargo');
const footerTexto = document.getElementById('cadastroFooterTexto');
const footerLink = document.getElementById('cadastroFooterLink');

// Três situações na mesma tela:
// - visitante: cadastro público, sempre cria Atendente e abre a sessão
// - Administrador logado: cadastra funcionário com o cargo escolhido (inclusive Administrador)
// - demais cargos logados: tela restrita
let modoGestor = false;
let bloqueado = false;

document.addEventListener('DOMContentLoaded', async () => {
    const usuario = await buscarSessao();
    if (!usuario) return;

    const ehAdministrador = usuario.administrador === true || usuario.cargo === 'Administrador';

    if (!ehAdministrador) {
        bloqueado = true;
        campoTitulo.textContent = 'Cadastro restrito';
        mostrarErro('Somente Administradores podem cadastrar funcionários. Peça a um Administrador para criar o acesso ou alterar seu cargo.');
        formCadastro.querySelectorAll('input, select, button').forEach((campo) => {
            campo.disabled = true;
        });
        footerTexto.textContent = 'Você já está logado.';
        footerLink.textContent = 'Voltar ao dashboard';
        footerLink.href = '/funcionarios.html';
        return;
    }

    modoGestor = true;
    campoTitulo.textContent = 'Cadastrar funcionário';
    campoCargo.hidden = false;
    footerTexto.textContent = 'Deseja voltar?';
    footerLink.textContent = 'Ir para o dashboard';
    footerLink.href = '/funcionarios.html';
});

function mostrarErro(mensagem) {
    cadastroErro.textContent = mensagem;
    cadastroErro.hidden = false;
}

formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (bloqueado) return;
    cadastroErro.hidden = true;

    const nome = document.getElementById('nome').value.trim();
    const documento = document.getElementById('documento').value;
    const email = document.getElementById('email').value.trim();
    const cargo = document.getElementById('cargo').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (!nome || !documento || !email || !senha || !confirmarSenha) {
        mostrarErro('Preencha todos os campos obrigatórios (nome, documento, e-mail, senha e confirmar senha).');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarErro('Informe um e-mail válido; ele será usado no login.');
        return;
    }

    if (senha !== confirmarSenha) {
        mostrarErro('As senhas não coincidem.');
        return;
    }

    btnCadastrar.disabled = true;
    btnCadastrar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...';

    try {
        if (modoGestor) {
            await apiFetch('/funcionarios', {
                method: 'POST',
                body: { nome, documento, email, cargo, senha, confirmarSenha }
            });
        } else {
            // Cadastro público não escolhe cargo: o backend cria como Atendente
            await apiFetch('/auth/cadastro', {
                method: 'POST',
                body: { nome, documento, email, senha, confirmarSenha }
            }, { redirecionar401: false });
        }

        window.location.href = '/funcionarios.html';
    } catch (error) {
        mostrarErro(error.message || 'Não foi possível criar o cadastro. Tente novamente.');
    } finally {
        btnCadastrar.disabled = false;
        btnCadastrar.innerHTML = '<i class="fa-solid fa-user-plus"></i> Criar cadastro';
    }
});
