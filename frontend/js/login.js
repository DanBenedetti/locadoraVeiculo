import { apiFetch } from './api.js';
import { buscarSessao } from './auth.js';

const formLogin = document.getElementById('formLogin');
const loginErro = document.getElementById('loginErro');
const btnEntrar = document.getElementById('btnEntrar');

// Se já existe sessão ativa, vai direto para a frota
document.addEventListener('DOMContentLoaded', async () => {
    const usuario = await buscarSessao();
    if (usuario) window.location.replace('/index.html');
});

function mostrarErro(mensagem) {
    loginErro.textContent = mensagem;
    loginErro.hidden = false;
}

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErro.hidden = true;

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    btnEntrar.disabled = true;
    btnEntrar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Entrando...';

    try {
        await apiFetch('/auth/login', {
            method: 'POST',
            body: { email, senha }
        }, { redirecionar401: false });

        window.location.replace('/index.html');
    } catch (error) {
        mostrarErro(error.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
    }
});
