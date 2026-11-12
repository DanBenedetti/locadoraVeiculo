import { apiFetch } from './api.js';
import { protegerPagina, ativarLogout, buscarSessao } from './auth.js';
import { escapeHtml } from './utils.js';

const estado = {
    usuario: null,
    funcionarios: [],
    edicaoId: null
};

const tabela = document.getElementById('tabelaFuncionarios');
const totalLabel = document.getElementById('totalFuncionarios');
const permissoesTexto = document.getElementById('permissoesTexto');
const btnNovoCadastro = document.getElementById('btnNovoCadastro');

const modal = document.getElementById('modalEdicao');
const formEdicao = document.getElementById('formEdicao');
const modalErro = document.getElementById('modalErro');
const btnCancelar = document.getElementById('btnCancelarEdicao');

const campos = {
    nome: document.getElementById('funcNome'),
    documento: document.getElementById('funcDocumento'),
    email: document.getElementById('funcEmail'),
    cargo: document.getElementById('funcCargo'),
    senha: document.getElementById('funcSenha'),
    confirmar: document.getElementById('funcConfirmar')
};

// A permissão vem do cargo: somente Administrador gerencia funcionários
const administrador = () => Boolean(estado.usuario?.administrador) || estado.usuario?.cargo === 'Administrador';
const ehProprio = (funcionario) => Number(funcionario.pessoa_id) === Number(estado.usuario?.pessoa_id);
const podeExcluir = (funcionario) => administrador() && !ehProprio(funcionario);

// Ações que o usuário logado pode executar nesta linha
function montarAcoes(funcionario) {
    if (!administrador()) {
        return '<span class="acao-bloqueada" title="Somente Administradores podem modificar funcionários"><i class="fa-solid fa-lock"></i></span>';
    }

    const acoes = [`
        <button class="btn-edit" data-acao="editar" data-id="${funcionario.pessoa_id}" title="Editar cadastro">
            <i class="fa-solid fa-pen"></i> Editar
        </button>
    `];

    if (podeExcluir(funcionario)) {
        acoes.push(`
            <button class="btn-delete" data-acao="excluir" data-id="${funcionario.pessoa_id}" title="Excluir cadastro">
                <i class="fa-solid fa-trash"></i> Excluir
            </button>
        `);
    }

    return acoes.join('');
}

// ---------- Lista ----------

async function carregarFuncionarios() {
    try {
        estado.funcionarios = await apiFetch('/funcionarios');
        renderizarFuncionarios();
        totalLabel.textContent = `${estado.funcionarios.length} cadastros`;
    } catch (error) {
        console.error(error);
        tabela.innerHTML = `<tr><td colspan="7" class="table-vazia">${escapeHtml(error.message)}</td></tr>`;
    }
}

function renderizarFuncionarios() {
    tabela.innerHTML = '';

    if (estado.funcionarios.length === 0) {
        tabela.innerHTML = '<tr><td colspan="7" class="table-vazia">Nenhum funcionário cadastrado.</td></tr>';
        return;
    }

    estado.funcionarios.forEach((funcionario, indice) => {
        const nivel = Number(funcionario.nivel_permissao_acesso) || 1;
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${indice + 1}</td>
            <td class="col-nome"><strong>${escapeHtml(funcionario.nome_razao_social)}</strong></td>
            <td class="col-documento">${escapeHtml(funcionario.documento || '—')}</td>
            <td class="col-email">${escapeHtml(funcionario.email || '—')}</td>
            <td class="col-cargo">${escapeHtml(funcionario.nome_cargo || '—')}</td>
            <td class="col-nivel">${nivel}</td>
            <td class="col-acoes">${montarAcoes(funcionario)}</td>
        `;

        tabela.appendChild(tr);
    });
}

// ---------- Modal de edição ----------

function abrirModal(funcionario) {
    estado.edicaoId = funcionario.pessoa_id;
    modalErro.hidden = true;

    campos.nome.value = funcionario.nome_razao_social || '';
    campos.documento.value = funcionario.documento || '';
    campos.email.value = funcionario.email || '';
    campos.cargo.value = funcionario.nome_cargo || 'Atendente';
    campos.senha.value = '';
    campos.confirmar.value = '';

    modal.showModal();
    campos.nome.focus();
}

function fecharModal() {
    estado.edicaoId = null;
    formEdicao.reset();
    modal.close();
}

async function salvarEdicao() {
    if (estado.edicaoId == null) return;

    modalErro.hidden = true;

    const nome = campos.nome.value.trim();
    const email = campos.email.value.trim();
    const senha = campos.senha.value;
    const confirmar = campos.confirmar.value;

    if (!nome) {
        return mostrarErroModal('Informe o nome do funcionário.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return mostrarErroModal('Informe um e-mail válido; ele é usado no login.');
    }
    if (senha || confirmar) {
        if (senha.length < 6) return mostrarErroModal('A senha deve ter pelo menos 6 caracteres.');
        if (senha !== confirmar) return mostrarErroModal('A senha e a confirmação são diferentes.');
    }

    const dados = { nome, email };
    if (senha) dados.senha = senha;
    if (administrador()) dados.cargo = campos.cargo.value;

    try {
        await apiFetch(`/funcionarios/${estado.edicaoId}`, { method: 'PUT', body: dados });
        fecharModal();

        // Se o próprio cadastro mudou de cargo, a sessão e a tela acompanham
        estado.usuario = (await buscarSessao()) || estado.usuario;
        configurarPermissoes();
        await carregarFuncionarios();
    } catch (error) {
        mostrarErroModal(error.message);
    }
}

function mostrarErroModal(mensagem) {
    modalErro.textContent = mensagem;
    modalErro.hidden = false;
}

async function excluirFuncionario(id) {
    if (!confirm('Excluir este cadastro do sistema?')) return;

    try {
        await apiFetch(`/funcionarios/${id}`, { method: 'DELETE' });
        await carregarFuncionarios();
    } catch (error) {
        alert(error.message);
    }
}

// ---------- Permissões e eventos ----------

function configurarPermissoes() {
    if (administrador()) {
        btnNovoCadastro.hidden = false;
        permissoesTexto.innerHTML = '<strong>Administrador:</strong> pode cadastrar funcionários (inclusive outros administradores), editar qualquer cadastro e excluir funcionários.';
        return;
    }

    btnNovoCadastro.hidden = true;
    permissoesTexto.innerHTML = `<strong>Seu cargo é ${escapeHtml(estado.usuario?.cargo || 'Atendente')}:</strong> somente Administradores podem cadastrar, excluir ou modificar funcionários.`;
}

function configurarEventos() {
    tabela.addEventListener('click', (evento) => {
        const botao = evento.target.closest('button[data-acao]');
        if (!botao) return;

        const id = Number(botao.dataset.id);

        if (botao.dataset.acao === 'editar') {
            const funcionario = estado.funcionarios.find((item) => Number(item.pessoa_id) === id);
            if (funcionario) abrirModal(funcionario);
        }

        if (botao.dataset.acao === 'excluir') {
            excluirFuncionario(id);
        }
    });

    formEdicao.addEventListener('submit', (evento) => {
        evento.preventDefault();
        salvarEdicao();
    });

    btnCancelar.addEventListener('click', fecharModal);
}

async function iniciar() {
    estado.usuario = await protegerPagina();
    if (!estado.usuario) return;

    ativarLogout();
    configurarPermissoes();

    configurarEventos();
    await carregarFuncionarios();
}

document.addEventListener('DOMContentLoaded', iniciar);
