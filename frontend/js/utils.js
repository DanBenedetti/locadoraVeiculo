// Escapa texto vindo do banco antes de inserir com innerHTML
export function escapeHtml(valor) {
    const div = document.createElement('div');
    div.textContent = valor == null ? '' : String(valor);
    return div.innerHTML;
}
