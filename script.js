// =====================================================
// NewHub Front-end Logic (Produtos & Conferência)
// Persistência via localStorage
// =====================================================

// ---------- Util ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const fmtInt = (n) => Number.parseInt(n, 10) || 0;
const nowISO = () => new Date().toISOString();

// ---------- Storage ----------
const LS_KEYS = {
  products: "newhub_products",
  moves: "newhub_moves"
};

function loadProducts() { return JSON.parse(localStorage.getItem(LS_KEYS.products) || "[]"); }
function saveProducts(list) { localStorage.setItem(LS_KEYS.products, JSON.stringify(list)); }
function loadMoves() { return JSON.parse(localStorage.getItem(LS_KEYS.moves) || "[]"); }
function saveMoves(list) { localStorage.setItem(LS_KEYS.moves, JSON.stringify(list)); }




// =====================================================
// Auth & Mock API (injetado)
// =====================================================
const AUTH_KEY = "newhub_logged";
const isLoggedIn = () => localStorage.getItem(AUTH_KEY) === "true";

async function apiLogin(user, pass) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (user === "admin" && pass === "1234") {
        resolve({ success: true, token: "fake-jwt-123456" });
      } else {
        reject({ success: false, message: "Usuário ou senha inválidos" });
      }
    }, 600);
  });
}

(function requireAuthForPages() {
  const protectedPages = ["produtos.html", "conferencia.html"];
  const currentPage = location.pathname.split("/").pop().toLowerCase();
  if (protectedPages.includes(currentPage) && !isLoggedIn()) {
    location.href = "login.html";
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const authLink = document.querySelector("#authLink");
  if (!authLink) return;
  if (isLoggedIn()) {
    authLink.textContent = "Sair";
    authLink.href = "#";
    authLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem(AUTH_KEY);
      location.href = "login.html";
    });
  } else {
    authLink.textContent = "Entrar";
    authLink.href = "login.html";
  }
});

(function initLoginPage() {
  const form = document.querySelector("#loginForm");
  if (!form) return;
  const inputUser = document.querySelector("#loginUser");
  const inputPass = document.querySelector("#loginPass");
  const errorMsg = document.querySelector("#loginError");
  if (isLoggedIn()) {
    window.location.href = "produtos.html";
    return;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";
    try {
      const res = await apiLogin(inputUser.value, inputPass.value);
      if (res.success) {
        localStorage.setItem(AUTH_KEY, "true");
        window.location.href = "produtos.html";
      }
    } catch (err) {
      errorMsg.textContent = err.message || 'Erro no login';
      errorMsg.style.display = "block";
    }
  });
})();

// // Seed opcional (comente se não quiser)
// if(loadProducts().length === 0){
//   saveProducts([
//     {id: crypto.randomUUID(), name:"Camiseta Preta", ref:"REF-001", stock:12, active:true},
//     {id: crypto.randomUUID(), name:"Calça Jeans", ref:"REF-002", stock:0, active:true},
//     {id: crypto.randomUUID(), name:"Tênis Runner", ref:"REF-003", stock:4, active:true},
//     {id: crypto.randomUUID(), name:"Moletom Cinza", ref:"REF-004", stock:22, active:false},
//   ]);
// }

// =====================================================
// Página de Produtos
// =====================================================
(function initProductsPage() {
  const listEl = $("#productsList");
  if (!listEl) return; // não está nesta página

  // Elements
  const pagEl = $("#productsPagination");
  const filterName = $("#filterName");
  const filterRef = $("#filterRef");
  const filterStatus = $("#filterStatus");
  const btnApply = $("#btnApplyFilters");
  const btnClear = $("#btnClearFilters");

  const overlayCreate = $("#overlayCreateProduct");
  const modalCreate = $("#modalCreateProduct");
  const btnOpenCreate = $("#btnOpenCreateProduct");
  const btnCloseCreate = $("#closeCreateProduct");
  const btnCancelCreate = $("#cancelCreateProduct");
  const formCreate = $("#createProductForm");
  const inputName = $("#prodName");
  const inputRef = $("#prodRef");
  const inputStock = $("#prodStock");

  const overlayEdit = $("#overlayEditProduct");
  const modalEdit = $("#modalEditProduct");
  const btnCloseEdit = $("#closeEditProduct");
  const btnCancelEdit = $("#cancelEditProduct");
  const formEdit = $("#editProductForm");
  const editId = $("#editId");
  const editName = $("#editName");
  const editRef = $("#editRef");
  const editStock = $("#editStock");
  const editStatus = $("#editStatus");

  // State
  let products = loadProducts();
  let currentPage = 1;
  const PAGE_SIZE = 10;

  // Modal helpers
  const openModal = (overlay, modal) => { overlay.classList.add("show"); modal.classList.add("show"); }
  const closeModal = (overlay, modal) => { overlay.classList.remove("show"); modal.classList.remove("show"); }

  // Open/Close Create
  btnOpenCreate?.addEventListener("click", () => { formCreate.reset(); openModal(overlayCreate, modalCreate); inputName.focus(); });
  [btnCloseCreate, btnCancelCreate, overlayCreate].forEach(el => el?.addEventListener("click", () => closeModal(overlayCreate, modalCreate)));

  // Open/Close Edit
  [btnCloseEdit, btnCancelEdit, overlayEdit].forEach(el => el?.addEventListener("click", () => closeModal(overlayEdit, modalEdit)));

  // Create Product
  formCreate?.addEventListener("submit", (e) => {
    e.preventDefault();
    const newProd = {
      id: crypto.randomUUID(),
      name: inputName.value.trim(),
      ref: inputRef.value.trim(),
      stock: fmtInt(inputStock.value),
      active: true
    };
    if (!newProd.name || !newProd.ref) return;
    products.push(newProd);
    saveProducts(products);
    closeModal(overlayCreate, modalCreate);
    render();
  });

  // Edit Product
  function openEdit(prod) {
    editId.value = prod.id;
    editName.value = prod.name;
    editRef.value = prod.ref;
    editStock.value = prod.stock;
    editStatus.value = String(!!prod.active);
    openModal(overlayEdit, modalEdit);
    editName.focus();
  }

  formEdit?.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = editId.value;
    const idx = products.findIndex(p => p.id === id);
    if (idx < 0) return;
    products[idx].name = editName.value.trim();
    products[idx].ref = editRef.value.trim();
    products[idx].stock = fmtInt(editStock.value);
    products[idx].active = editStatus.value === "true";
    saveProducts(products);
    closeModal(overlayEdit, modalEdit);
    render();
  });

  // Filters
  function readFilters() {
    return {
      name: filterName.value.trim().toLowerCase(),
      ref: filterRef.value.trim().toLowerCase(),
      status: filterStatus.value // all | active | inactive
    };
  }
  function applyFilters() {
    currentPage = 1;
    render();
  }
  btnApply?.addEventListener("click", applyFilters);
  btnClear?.addEventListener("click", () => {
    filterName.value = ""; filterRef.value = ""; filterStatus.value = "all"; applyFilters();
  });

  // Pagination
  function renderPagination(total) {
    pagEl.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.textContent = "‹";
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", () => { currentPage--; render(); });
    pagEl.appendChild(prev);

    for (let p = 1; p <= totalPages; p++) {
      const b = document.createElement("button");
      b.className = "page-btn" + (p === currentPage ? " active" : "");
      b.textContent = String(p);
      b.addEventListener("click", () => { currentPage = p; render(); });
      pagEl.appendChild(b);
    }

    const next = document.createElement("button");
    next.className = "page-btn";
    next.textContent = "›";
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", () => { currentPage++; render(); });
    pagEl.appendChild(next);
  }

  // Render products list
  function render() {
    products = loadProducts();

    const f = readFilters();
    let filtered = products.filter(p => {
      const nm = p.name.toLowerCase().includes(f.name);
      const rf = p.ref.toLowerCase().includes(f.ref);
      const st = f.status === "all" ? true : (f.status === "active" ? p.active : !p.active);
      return nm && rf && st;
    });

    renderPagination(filtered.length);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = "";
    pageItems.forEach(p => {
      const item = document.createElement("div");
      item.className = "item";

      const zeroStockIcon = p.stock === 0 ? `<span class="alert-icon" title="Estoque zerado">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4" stroke="#f5c842" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="17" r="1" fill="#f5c842"/>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f5c842" stroke-width="2" fill="none"/>
        </svg>
      </span>` : "";

      item.innerHTML = `
        <div class="left">
          ${zeroStockIcon}
          <div>
            <div class="name">${p.name}</div>
            <div class="meta">Ref: <b>${p.ref}</b> • Estoque: <b>${p.stock}</b></div>
          </div>
        </div>
        <div class="right">
          <span class="badge ${p.active ? "green" : "red"}">${p.active ? "Ativo" : "Inativo"}</span>
          <div class="actions">
            <button class="btn" data-edit="${p.id}">Editar</button>
            <button class="btn ghost" data-toggle="${p.id}">${p.active ? "Inativar" : "Ativar"}</button>
          </div>
        </div>
      `;
      listEl.appendChild(item);
    });

    // Wire actions
    $$("button[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit");
        const prod = products.find(x => x.id === id);
        if (prod) openEdit(prod);
      });
    });
    $$("button[data-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-toggle");
        const idx = products.findIndex(x => x.id === id);
        if (idx >= 0) {
          products[idx].active = !products[idx].active;
          saveProducts(products);
          render();
        }
      });
    });
  }

  render();
})();

// =====================================================
// Página de Conferência
// =====================================================
(function initConferencePage() {
  const listEl = $("#movesList");
  if (!listEl) return; // não está nesta página

  const pagEl = $("#movesPagination");
  const overlay = $("#overlayCreateMove");
  const modal = $("#modalCreateMove");
  const btnOpen = $("#btnOpenCreateMove");
  const btnClose = $("#closeCreateMove");
  const btnCancel = $("#cancelCreateMove");
  const form = $("#createMoveForm");
  const selType = $("#moveType");
  const inputRef = $("#moveRef");
  const hint = $("#moveProdHint");
  const inputQty = $("#moveQty");

  // State
  let moves = loadMoves();
  let products = loadProducts();
  let currentPage = 1;
  const PAGE_SIZE = 10;

  const open = () => { overlay.classList.add("show"); modal.classList.add("show"); inputRef.focus(); hint.textContent = ""; }
  const close = () => { overlay.classList.remove("show"); modal.classList.remove("show"); form.reset(); hint.textContent = ""; }

  btnOpen?.addEventListener("click", open);
  [overlay, btnClose, btnCancel].forEach(el => el?.addEventListener("click", close));

  // Busca automática por referência
  inputRef?.addEventListener("input", () => {
    products = loadProducts();
    const ref = inputRef.value.trim();
    const prod = products.find(p => p.ref.toLowerCase() === ref.toLowerCase());
    hint.textContent = prod ? `Encontrado: ${prod.name} • Estoque atual: ${prod.stock}` : "Produto não encontrado";
    hint.style.color = prod ? "#0fd6a8" : "#ff7a7a";
  });

  // Finalizar movimentação
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    products = loadProducts();
    const type = selType.value; // saida | entrada
    const ref = inputRef.value.trim();
    const qty = fmtInt(inputQty.value);
    if (!ref || qty <= 0) return;

    const idx = products.findIndex(p => p.ref.toLowerCase() === ref.toLowerCase());
    if (idx < 0) { alert("Produto não encontrado!"); return; }

    if (type === "saida" && products[idx].stock < qty) {
      alert("Estoque insuficiente para saída."); return;
    }

    // atualiza estoque
    products[idx].stock = type === "saida" ? products[idx].stock - qty : products[idx].stock + qty;
    saveProducts(products);

    // registra movimento
    moves.push({
      id: crypto.randomUUID(),
      type, ref,
      name: products[idx].name,
      qty,
      at: nowISO()
    });
    saveMoves(moves);

    close();
    render();
  });

  function renderPagination(total) {
    pagEl.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.textContent = "‹";
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", () => { currentPage--; render(); });
    pagEl.appendChild(prev);

    for (let p = 1; p <= totalPages; p++) {
      const b = document.createElement("button");
      b.className = "page-btn" + (p === currentPage ? " active" : "");
      b.textContent = String(p);
      b.addEventListener("click", () => { currentPage = p; render(); });
      pagEl.appendChild(b);
    }

    const next = document.createElement("button");
    next.className = "page-btn";
    next.textContent = "›";
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", () => { currentPage++; render(); });
    pagEl.appendChild(next);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function render() {
    moves = loadMoves().sort((a, b) => b.at.localeCompare(a.at)); // recentes primeiro

    renderPagination(moves.length);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = moves.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = "";
    pageItems.forEach(m => {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div class="badge ${m.type === 'entrada' ? 'green' : 'red'}">${m.type === 'entrada' ? 'Entrada' : 'Saída'}</div>
          <div>
            <div class="name">${m.name ?? ''}</div>
            <div class="meta">Ref: <b>${m.ref}</b> • Qtd: <b>${m.qty}</b> • ${formatDate(m.at)}</div>
          </div>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  render();
})();


// =====================================================
// Página de Relatório
// =====================================================
(function initReportPage() {
  const listEl = document.querySelector("#reportList");
  if (!listEl) return; // não está nesta página

  const inputStart = document.querySelector("#filterStart");
  const inputEnd = document.querySelector("#filterEnd");
  const selType = document.querySelector("#filterType");
  const btnApply = document.querySelector("#btnApplyReport");
  const btnPdf = document.querySelector("#btnExportPdf");

  let filtered = [];

  function formatDate(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function applyFilters() {
    const moves = loadMoves();
    const start = inputStart.value ? new Date(inputStart.value) : null;
    const end = inputEnd.value ? new Date(inputEnd.value) : null;
    const type = selType.value;

    filtered = moves.filter(m => {
      const d = new Date(m.at);
      if (start && d < start) return false;
      if (end && d > end) return false;
      if (type !== "all" && m.type !== type) return false;
      return true;
    }).sort((a, b) => b.at.localeCompare(a.at));

    render();
  }

  function render() {
    listEl.innerHTML = "";
    if (filtered.length === 0) {
      listEl.innerHTML = "<p>Nenhum resultado encontrado.</p>";
      return;
    }
    filtered.forEach(m => {
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="left">
          <div class="badge ${m.type === 'entrada' ? 'green' : 'red'}">${m.type}</div>
          <div>
            <div class="name">${m.name ?? ""}</div>
            <div class="meta">Ref: <b>${m.ref}</b> • Qtd: <b>${m.qty}</b> • ${formatDate(m.at)}</div>
          </div>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // Exportar PDF
  btnPdf?.addEventListener("click", () => {
    if (filtered.length === 0) { alert("Nenhum dado para exportar."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Relatório de Movimentações - NewHub", 14, 18);

    const rows = filtered.map(m => [
      formatDate(m.at),
      m.type,
      m.ref,
      m.name ?? "",
      m.qty
    ]);

    doc.autoTable({
      head: [["Data/Hora", "Tipo", "Referência", "Produto", "Qtd"]],
      body: rows,
      startY: 25
    });

    doc.save("relatorio_movimentacoes.pdf");
  });

  btnApply?.addEventListener("click", applyFilters);

})();