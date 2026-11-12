import { apiFetch } from './api.js';
import { protegerPagina, ativarLogout } from './auth.js';
import { escapeHtml } from './utils.js';

async function iniciar() {
    const usuario = await protegerPagina();
    if (!usuario) return;

    ativarLogout();
    await carregarLogs();
}

async function carregarLogs() {
    const tbody = document.getElementById('tabelaLogs');

    try {
        const logs = await apiFetch('/logs');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="table-vazia">Nenhum log registrado.</td></tr>';
            return;
        }

        logs.forEach((log, indice) => {
            const tr = document.createElement('tr');
            const dataFormatada = new Date(log.dataCriacao).toLocaleString('pt-BR');
            const detalhes = log.detalhes || {};

            tr.innerHTML = `
                <td>${indice + 1}</td>
                <td><span class="tag-acao ${escapeHtml(log.acao)}">${escapeHtml(log.acao)}</span></td>
                <td>${formatarDetalhes(log.acao, detalhes)}</td>
                <td>${dataFormatada}</td>
            `;

            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        tbody.innerHTML = `<tr><td colspan="4" class="table-vazia">${escapeHtml(error.message)}</td></tr>`;
    }
}

function formatarDetalhes(acao, detalhes) {
    switch (acao) {
        case 'CRIAR_VEICULO':
            return `
                <strong>Modelo:</strong> ${escapeHtml(detalhes.modelo || 'N/A')}<br>
                <strong>Marca:</strong> ${escapeHtml(detalhes.marca || 'N/A')}<br>
                <strong>Placa:</strong> ${escapeHtml(detalhes.placa || 'N/A')}<br>
                <strong>Diária:</strong> R$ ${Number(detalhes.preco_diaria || 0).toFixed(2)}<br>
                <small>ID gerado: ${escapeHtml(detalhes.id || 'N/A')}</small>
            `;

        case 'ATUALIZAR_VEICULO': {
            const antes = detalhes.antes || {};
            return `
                <strong>${escapeHtml(detalhes.modelo || 'N/A')}</strong> (${escapeHtml(detalhes.placa || 'N/A')})<br>
                <strong>Status:</strong> ${escapeHtml(antes.status || 'N/A')} → <strong>${escapeHtml(detalhes.status || 'N/A')}</strong><br>
                <strong>Diária:</strong> R$ ${Number(antes.preco_diaria || 0).toFixed(2)} → R$ ${Number(detalhes.preco_diaria || 0).toFixed(2)}<br>
                <small>ID: ${escapeHtml(detalhes.id || 'N/A')}</small>
            `;
        }

        case 'DELETAR_VEICULO':
            return `
                <span style="color:var(--warn);">ID removido:</span>
                <strong>${escapeHtml(detalhes.idRemovido || detalhes.id || 'N/A')}</strong>
            `;

        case 'LOGIN': {
            const sucesso = detalhes.resultado === 'SUCESSO';
            return `
                <strong>Resultado:</strong>
                <span style="color:${sucesso ? 'var(--ok)' : 'var(--warn)'}; font-weight:700;">${escapeHtml(detalhes.resultado || 'N/A')}</span><br>
                <strong>Usuário:</strong> ${escapeHtml(detalhes.nome || detalhes.email || detalhes.pessoa_id || 'N/A')}<br>
                ${detalhes.email ? `<strong>E-mail:</strong> ${escapeHtml(detalhes.email)}<br>` : ''}
                <small>IP: ${escapeHtml(detalhes.ip || 'N/A')}</small>
            `;
        }

        case 'LOGOUT':
            return `
                <strong>Usuário:</strong> ${escapeHtml(detalhes.nome || detalhes.pessoa_id || 'N/A')}<br>
                <small>${escapeHtml(detalhes.mensagem || 'Sessão encerrada')}</small>
            `;

        case 'CRIAR_FUNCIONARIO':
        case 'ATUALIZAR_FUNCIONARIO':
        case 'DELETAR_FUNCIONARIO':
            return `
                <strong>Funcionário:</strong> ${escapeHtml(detalhes.nome || 'N/A')}<br>
                ${detalhes.documento ? `<strong>Documento:</strong> ${escapeHtml(detalhes.documento)}<br>` : ''}
                ${detalhes.cargo ? `<strong>Cargo:</strong> ${escapeHtml(detalhes.cargo)}<br>` : ''}
                <small>${escapeHtml(detalhes.resultado || '')} ${detalhes.pessoa_id ? `Pessoa #${escapeHtml(detalhes.pessoa_id)}` : ''}</small>
            `;

        default:
            return escapeHtml(JSON.stringify(detalhes));
    }
}

document.addEventListener('DOMContentLoaded', iniciar);
