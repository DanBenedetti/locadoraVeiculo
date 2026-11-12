import { apiFetch } from './api.js';
import { protegerPagina, ativarLogout } from './auth.js';
import { escapeHtml } from './utils.js';

const API_URL = '/veiculos';
const STATUS = ['Disponível', 'Alugado', 'Manutenção'];

const veiculosGrid = document.getElementById('veiculosGrid');
const formVeiculo = document.getElementById('formVeiculo');
const totalVeiculos = document.getElementById('totalVeiculos');
const searchInput = document.getElementById('searchInput');

const statTotal = document.getElementById('statTotal');
const statDisponiveis = document.getElementById('statDisponiveis');
const statAlugados = document.getElementById('statAlugados');
const statManutencao = document.getElementById('statManutencao');

let veiculosCache = [];
let usuarioAtual = null;

async function iniciar() {
    usuarioAtual = await protegerPagina();
    if (!usuarioAtual) return;

    ativarLogout();
    configurarEventos();
    await carregarVeiculos();
}

async function carregarVeiculos() {
    try {
        veiculosCache = await apiFetch(API_URL);
        renderizarVeiculos(veiculosCache);
        atualizarEstatisticas();
    } catch (error) {
        console.error(error);
        veiculosGrid.innerHTML = `<p class="grid-erro">${escapeHtml(error.message)}</p>`;
    }
}

function atualizarEstatisticas() {
    statTotal.textContent = veiculosCache.length;
    statDisponiveis.textContent = veiculosCache.filter((v) => v.status === 'Disponível').length;
    statAlugados.textContent = veiculosCache.filter((v) => v.status === 'Alugado').length;
    statManutencao.textContent = veiculosCache.filter((v) => v.status === 'Manutenção').length;
}

function renderizarVeiculos(veiculos) {
    veiculosGrid.innerHTML = '';
    totalVeiculos.textContent = `${veiculos.length} ${veiculos.length === 1 ? 'veículo' : 'veículos'}`;

    if (veiculos.length === 0) {
        veiculosGrid.innerHTML = '<p>Nenhum veículo encontrado. Cadastre o primeiro!</p>';
        return;
    }

    veiculos.forEach((veiculo) => {
        const card = document.createElement('article');
        card.className = 'fleet-card';
        card.dataset.id = veiculo.id;

        card.innerHTML = `
            <div class="fleet-card-top">
                <i class="fa-solid fa-car-side"></i>
                <span class="vehicle-status ${escapeHtml(veiculo.status)}">${escapeHtml(veiculo.status)}</span>
            </div>
            <div class="fleet-card-body">
                <div class="vehicle-title">${escapeHtml(veiculo.modelo)}</div>
                <div class="vehicle-marca">${escapeHtml(veiculo.marca)}</div>
                <div class="vehicle-placa">
                    <span class="placa-band">BR</span>
                    <span class="placa-text">${escapeHtml(veiculo.placa)}</span>
                </div>
                <div class="vehicle-preco">R$ ${Number(veiculo.preco_diaria).toFixed(2)} <small>/dia</small></div>
                <div class="card-actions">
                    <button class="btn-edit" data-acao="editar">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button class="btn-delete" data-acao="excluir">
                        <i class="fa-solid fa-trash"></i> Excluir
                    </button>
                </div>
                <div class="card-edit" hidden>
                    <div class="field">
                        <label>Status</label>
                        <select class="edit-status">
                            ${STATUS.map((status) => `<option value="${status}" ${veiculo.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                        </select>
                    </div>
                    <div class="field">
                        <label>Diária (R$)</label>
                        <input type="number" class="edit-preco" step="0.01" min="0.01" value="${Number(veiculo.preco_diaria)}">
                    </div>
                    <button class="btn-save" data-acao="salvar">
                        <i class="fa-solid fa-check"></i> Salvar alterações
                    </button>
                </div>
            </div>
        `;

        veiculosGrid.appendChild(card);
    });
}

async function salvarVeiculo(card) {
    const id = Number(card.dataset.id);
    const status = card.querySelector('.edit-status').value;
    const preco_diaria = parseFloat(card.querySelector('.edit-preco').value);

    if (!preco_diaria || preco_diaria <= 0) {
        alert('Informe uma diária maior que zero.');
        return;
    }

    try {
        await apiFetch(`${API_URL}/${id}`, { method: 'PUT', body: { preco_diaria, status } });
        await carregarVeiculos();
    } catch (error) {
        alert(error.message);
    }
}

async function excluirVeiculo(id) {
    if (!confirm('Deseja realmente excluir este veículo?')) return;

    try {
        await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
        await carregarVeiculos();
    } catch (error) {
        alert(error.message);
    }
}

function configurarEventos() {
    veiculosGrid.addEventListener('click', (evento) => {
        const botao = evento.target.closest('button[data-acao]');
        if (!botao) return;

        const card = botao.closest('.fleet-card');
        const acao = botao.dataset.acao;

        if (acao === 'editar') {
            const edicao = card.querySelector('.card-edit');
            edicao.hidden = !edicao.hidden;
        }

        if (acao === 'salvar') {
            salvarVeiculo(card);
        }

        if (acao === 'excluir') {
            excluirVeiculo(Number(card.dataset.id));
        }
    });

    formVeiculo.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const dados = {
            modelo: document.getElementById('modeloVeiculo').value,
            marca: document.getElementById('marcaVeiculo').value,
            placa: document.getElementById('placaVeiculo').value.toUpperCase(),
            preco_diaria: parseFloat(document.getElementById('precoDiaria').value),
            status: document.getElementById('statusVeiculo').value
        };

        try {
            await apiFetch(API_URL, { method: 'POST', body: dados });
            formVeiculo.reset();
            await carregarVeiculos();
        } catch (error) {
            alert(error.message);
        }
    });

    searchInput.addEventListener('input', (evento) => {
        const termo = evento.target.value.toLowerCase();
        const filtrados = veiculosCache.filter((veiculo) =>
            veiculo.modelo.toLowerCase().includes(termo) ||
            veiculo.marca.toLowerCase().includes(termo) ||
            veiculo.placa.toLowerCase().includes(termo)
        );
        renderizarVeiculos(filtrados);
    });
}

document.addEventListener('DOMContentLoaded', iniciar);
