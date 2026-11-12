// Centraliza as chamadas à API para todas as páginas.
// - serializa o corpo em JSON
// - redireciona para o login quando a sessão expirou (exceto na própria tela de login)
// - transforma respostas de erro em Error com a mensagem do backend
export async function apiFetch(url, opcoes = {}, { redirecionar401 = true } = {}) {
    const config = { credentials: 'same-origin', ...opcoes };

    if (config.body !== undefined && typeof config.body !== 'string') {
        config.headers = { 'Content-Type': 'application/json', ...(config.headers || {}) };
        config.body = JSON.stringify(config.body);
    }

    const resposta = await fetch(url, config);
    const dados = await resposta.json().catch(() => ({}));

    if (resposta.status === 401 && redirecionar401) {
        window.location.replace('/login.html');
    }

    if (!resposta.ok) {
        const erro = new Error(dados.mensagem || 'Não foi possível concluir a operação.');
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}
