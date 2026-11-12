// Sessão e topbar compartilhadas pelas páginas internas.

// Consulta a sessão atual sem redirecionar (usado nas telas públicas)
export async function buscarSessao() {
    try {
        const resposta = await fetch('/auth/me', { credentials: 'same-origin' });
        if (!resposta.ok) return null;
        const { usuario } = await resposta.json();
        return usuario || null;
    } catch (error) {
        console.error('Erro ao consultar a sessão:', error);
        return null;
    }
}

// Protege a página no cliente: sem sessão, volta para o login
export async function protegerPagina() {
    const usuario = await buscarSessao();
    if (!usuario) {
        window.location.replace('/login.html');
        return null;
    }
    preencherTopbar(usuario);
    return usuario;
}

function preencherTopbar(usuario) {
    const nome = document.getElementById('usuarioNome');
    const cargo = document.getElementById('usuarioCargo');
    if (nome) nome.textContent = usuario.nome;
    if (cargo) cargo.textContent = usuario.cargo || 'Funcionário';
}

// Liga o botão "Sair" da topbar
export function ativarLogout() {
    const botao = document.getElementById('btnLogout');
    if (!botao) return;

    botao.addEventListener('click', async () => {
        try {
            await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
        window.location.replace('/login.html');
    });
}
