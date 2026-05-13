// Configuração do Supabase
const SUPABASE_URL = "https://ovndhiuwpkqdzgkjolxo.supabase.co";
const SUPABASE_KEY = "sb_publishable_7UslSMapZXTPYakbTcj4FQ_Vj6CKrJ_";

// O script do CDN já define um objeto global 'supabase'.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estado Global
let currentUser = null;
let services = [];
let allTransactions = []; // Base de dados completa
let filteredTransactions = []; // Dados filtrados
let currentPeriod = 'all';
let mainChart = null;

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  initAuth();
  setupEventListeners();
  setPeriod('all'); // Inicializa filtros
});

// Autenticação
function initAuth() {
  if (!supabaseClient) {
    showAuthScreen();
    return;
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      hideAuthScreen();
      loadData();
    } else {
      showAuthScreen();
    }
  });
}

function showAuthScreen() {
  const authScreen = document.getElementById("auth-screen");
  const app = document.getElementById("app");
  const nav = document.getElementById("bottom-nav");
  if (authScreen) authScreen.classList.remove("hidden");
  if (app) app.classList.add("hidden");
  if (nav) nav.classList.add("hidden");
}

function hideAuthScreen() {
  const authScreen = document.getElementById("auth-screen");
  const app = document.getElementById("app");
  const nav = document.getElementById("bottom-nav");
  if (authScreen) authScreen.classList.add("hidden");
  if (app) app.classList.remove("hidden");
  if (nav) nav.classList.remove("hidden");
}

// Event Listeners
function setupEventListeners() {
  // Login
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } catch (error) {
        alert("Erro no login: " + error.message);
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => supabaseClient.auth.signOut());
  }

  // Service Form
  const serviceForm = document.getElementById("service-form");
  if (serviceForm) {
    serviceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("service-id").value;
      const data = {
        user_id: currentUser.id,
        name: document.getElementById("service-name").value,
        price: parseFloat(document.getElementById("service-price").value),
      };

      if (id) {
        await supabaseClient.from("services").update(data).eq("id", id);
      } else {
        await supabaseClient.from("services").insert(data);
      }
      closeModal("service-modal");
      loadData();
    });
  }

  // Transaction Form
  const transactionForm = document.getElementById("transaction-form");
  if (transactionForm) {
    transactionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("trans-id").value;
      const data = {
        user_id: currentUser.id,
        type: document.getElementById("trans-type").value,
        description: document.getElementById("trans-desc").value,
        amount: parseFloat(document.getElementById("trans-amount").value),
        date: document.getElementById("trans-date").value,
        service_id: document.getElementById("trans-service").value || null,
      };

      if (id) {
        await supabaseClient.from("transactions").update(data).eq("id", id);
      } else {
        await supabaseClient.from("transactions").insert(data);
      }
      closeModal("transaction-modal");
      loadData();
    });
  }

  // Delete Buttons
  const delServiceBtn = document.getElementById('delete-service-btn');
  if (delServiceBtn) {
    delServiceBtn.onclick = async () => {
      const id = document.getElementById("service-id").value;
      if (confirm("Excluir este serviço?")) {
        await supabaseClient.from("services").delete().eq("id", id);
        closeModal("service-modal");
        loadData();
      }
    };
  }

  const delTransBtn = document.getElementById('delete-trans-btn');
  if (delTransBtn) {
    delTransBtn.onclick = async () => {
      const id = document.getElementById("trans-id").value;
      if (confirm("Excluir esta movimentação?")) {
        await supabaseClient.from("transactions").delete().eq("id", id);
        closeModal("transaction-modal");
        loadData();
      }
    };
  }
}

// Navegação (SPA Router Simples)
function switchView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.remove("hidden");

  // Update nav icons
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("text-gold");
  });
  
  // Find active nav item
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
      if (item.getAttribute('onclick').includes(`'${viewId}'`)) {
          item.classList.add('text-gold');
      }
  });

  applyFilters(); 
}

// Carregamento de Dados
async function loadData() {
  if (!currentUser) return;

  // Buscar Serviços
  const { data: srvData } = await supabaseClient
    .from("services")
    .select("*")
    .order("name");
  services = srvData || [];
  renderServices();
  updateServiceSelect();

  // Buscar Transações
  const { data: transData } = await supabaseClient
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });
  allTransactions = transData || [];
  applyFilters();
}

function setPeriod(period) {
    currentPeriod = period;
    
    // Atualiza estilo dos botões
    document.querySelectorAll('.period-btn').forEach(btn => {
        if (btn.dataset.period === period) {
            btn.classList.add('bg-gold', 'text-charcoal');
            btn.classList.remove('bg-anthracite', 'text-pearl');
        } else {
            btn.classList.remove('bg-gold', 'text-charcoal');
            btn.classList.add('bg-anthracite', 'text-pearl');
        }
    });
    
    applyFilters();
}

function applyFilters() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    filteredTransactions = allTransactions.filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        
        if (currentPeriod === 'today') {
            return tDate.getTime() === today.getTime();
        } else if (currentPeriod === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return tDate >= weekAgo;
        } else if (currentPeriod === 'month') {
            return tDate.getMonth() === today.getMonth() && tDate.getFullYear() === today.getFullYear();
        }
        return true; // 'all'
    });

    renderTransactions();
    updateDashboard();
}

// Renderização de Listas
function renderServices() {
  const list = document.getElementById("services-list");
  if (!list) return;
  list.innerHTML = services
    .map(
      (s) => `
        <div onclick="openModal('service-modal', ${JSON.stringify(s).replace(/"/g, "&quot;")})" 
             class="bg-anthracite p-4 rounded-xl border border-bronze flex justify-between items-center active:bg-bronze/20">
            <div>
                <p class="font-bold">${s.name}</p>
                <p class="text-xs text-pearl/50">Serviço Cadastrado</p>
            </div>
            <p class="text-gold font-bold">R$ ${s.price.toFixed(2)}</p>
        </div>
    `
    )
    .join("");
}

function renderTransactions() {
  const list = document.getElementById("transactions-list");
  if (!list) return;

  if (filteredTransactions.length === 0) {
      list.innerHTML = '<p class="text-center text-pearl/30 py-10">Nenhuma movimentação neste período.</p>';
      return;
  }
  
  list.innerHTML = filteredTransactions
    .map(
      (t) => `
        <div onclick="openTransactionModal('${t.type}', ${JSON.stringify(t).replace(/"/g, "&quot;")})" 
             class="bg-anthracite p-4 rounded-xl border border-bronze flex justify-between items-center active:bg-bronze/20">
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-full ${t.type === "income" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}">
                    <i data-lucide="${t.type === "income" ? "trending-up" : "trending-down"}" class="w-4 h-4"></i>
                </div>
                <div>
                    <p class="font-medium text-sm">${t.description}</p>
                    <p class="text-[10px] text-pearl/50">${new Date(t.date + 'T12:00:00').toLocaleDateString("pt-BR")}</p>
                </div>
            </div>
            <p class="font-bold ${t.type === "income" ? "text-green-400" : "text-red-400"}">
                ${t.type === "income" ? "+" : "-"} R$ ${t.amount.toFixed(2)}
            </p>
        </div>
    `
    )
    .join("");
  lucide.createIcons();
}

function updateServiceSelect() {
  const select = document.getElementById("trans-service");
  if (!select) return;
  select.innerHTML =
    '<option value="">Outro / Manual</option>' +
    services
      .map(
        (s) =>
          `<option value="${s.id}" data-price="${s.price}">${s.name}</option>`
      )
      .join("");

  select.onchange = (e) => {
    const option = e.target.selectedOptions[0];
    if (option.value) {
      document.getElementById("trans-desc").value = option.text;
      document.getElementById("trans-amount").value = option.dataset.price;
    }
  };
}

// PDF Export
async function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = `Relatorio RL Barbershop - Periodo: ${currentPeriod.toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('pt-BR');
    
    doc.setFontSize(18);
    doc.setTextColor(166, 137, 84); // Gold color
    doc.text('RL Barbershop', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(43, 43, 43); // Dark color
    doc.text(title, 14, 30);
    doc.text(`Gerado em: ${dateStr}`, 14, 38);

    const totalIn = filteredTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalOut = filteredTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

    const summaryData = [
        ['Total de Ganhos', `R$ ${totalIn.toFixed(2)}`],
        ['Total de Despesas', `R$ ${totalOut.toFixed(2)}`],
        ['Saldo Final', `R$ ${(totalIn - totalOut).toFixed(2)}`]
    ];

    doc.autoTable({
        startY: 45,
        head: [['Resumo Financeiro', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [166, 137, 84] }
    });

    const tableData = filteredTransactions.map(t => [
        new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        t.description,
        t.type === 'income' ? 'Ganho' : 'Despesa',
        `R$ ${t.amount.toFixed(2)}`
    ]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Data', 'Descrição', 'Tipo', 'Valor']],
        body: tableData,
        headStyles: { fillColor: [43, 43, 43] }
    });

    doc.save(`relatorio-financeiro-${currentPeriod}-${new Date().getTime()}.pdf`);
}

// Dashboard & Gráficos
function updateDashboard() {
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const totalBalanceEl = document.getElementById("total-balance");
  const totalIncomeEl = document.getElementById("total-income");
  const totalExpenseEl = document.getElementById("total-expense");

  if (totalBalanceEl) totalBalanceEl.textContent = `R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (totalIncomeEl) totalIncomeEl.textContent = `R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (totalExpenseEl) totalExpenseEl.textContent = `R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // KPIs
  const incomeTrans = filteredTransactions.filter((t) => t.type === "income");
  const avgTicket = incomeTrans.length > 0 ? totalIncome / incomeTrans.length : 0;
  
  const kpiAvgTicketEl = document.getElementById("kpi-avg-ticket");
  const kpiCountEl = document.getElementById("kpi-count");

  if (kpiAvgTicketEl) kpiAvgTicketEl.textContent = `R$ ${avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (kpiCountEl) kpiCountEl.textContent = incomeTrans.length;

  renderChart();
}

function renderChart() {
  const chartEl = document.getElementById('mainChart');
  if (!chartEl) return;
  const ctx = chartEl.getContext("2d");
  
  let labels = [];
  let incomes = [];
  let expenses = [];
  
  if (currentPeriod === 'today') {
      labels = ['Hoje'];
      incomes = [filteredTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0)];
      expenses = [filteredTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)];
  } else {
      const groups = {};
      filteredTransactions.forEach(t => {
          const key = new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'});
          if (!groups[key]) groups[key] = { in: 0, out: 0 };
          groups[key][t.type === 'income' ? 'in' : 'out'] += t.amount;
      });
      labels = Object.keys(groups).reverse();
      incomes = labels.map(l => groups[l].in);
      expenses = labels.map(l => groups[l].out);
  }

  if (mainChart) mainChart.destroy();

  mainChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ganhos",
          data: incomes,
          backgroundColor: "#A68954",
          borderRadius: 5,
        },
        {
          label: "Gastos",
          data: expenses,
          backgroundColor: "#5C4026",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { grid: { color: "#2B2B2B" }, ticks: { color: "#E5E2D9" } },
        x: { grid: { display: false }, ticks: { color: "#E5E2D9" } },
      },
    },
  });
}

// Modals
function openModal(modalId, data = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");

  if (modalId === "service-modal") {
    const form = document.getElementById("service-form");
    const title = document.getElementById("service-modal-title");
    const delBtn = document.getElementById("delete-service-btn");

    if (data) {
      title.textContent = "Editar Serviço";
      document.getElementById("service-id").value = data.id;
      document.getElementById("service-name").value = data.name;
      document.getElementById("service-price").value = data.price;
      delBtn.classList.remove("hidden");
    } else {
      title.textContent = "Novo Serviço";
      if (form) form.reset();
      document.getElementById("service-id").value = "";
      delBtn.classList.add("hidden");
    }
  }
  lucide.createIcons();
}

function openTransactionModal(type, data = null) {
  const modal = document.getElementById("transaction-modal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const form = document.getElementById("transaction-form");
  const title = document.getElementById("transaction-modal-title");
  const delBtn = document.getElementById("delete-trans-btn");
  const serviceGroup = document.getElementById("service-select-group");

  document.getElementById("trans-type").value = type;
  if (serviceGroup) serviceGroup.style.display = type === "income" ? "block" : "none";

  if (data) {
    title.textContent = type === "income" ? "Editar Ganho" : "Editar Despesa";
    document.getElementById("trans-id").value = data.id;
    document.getElementById("trans-desc").value = data.description;
    document.getElementById("trans-amount").value = data.amount;
    document.getElementById("trans-date").value = data.date;
    document.getElementById("trans-service").value = data.service_id || "";
    if (delBtn) delBtn.classList.remove("hidden");
  } else {
    title.textContent = type === "income" ? "Novo Ganho" : "Nova Despesa";
    if (form) form.reset();
    document.getElementById("trans-id").value = "";
    document.getElementById("trans-date").value = new Date().toISOString().split('T')[0];
    if (delBtn) delBtn.classList.add("hidden");
  }
  lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}

// Toggle FAB Dashboard
function toggleFab() {
    const menu = document.getElementById('fab-menu');
    const icon = document.getElementById('fab-icon');
    if (!menu || !icon) return;
    
    const isHidden = menu.classList.toggle('hidden');
    
    if (!isHidden) {
        icon.setAttribute('data-lucide', 'x');
    } else {
        icon.setAttribute('data-lucide', 'plus');
    }
    lucide.createIcons();
}

// --- Lógica PWA (Service Worker e Instalação) ---

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado!', reg))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}

let deferredPrompt;
const installBtns = document.querySelectorAll('.pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Impede que o mini-infobar apareça no mobile
    e.preventDefault();
    // Guarda o evento para ser acionado depois
    deferredPrompt = e;
    // Mostra os botões de instalação
    installBtns.forEach(btn => btn.classList.remove('hidden'));
});

installBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Mostra o prompt de instalação
        deferredPrompt.prompt();
        // Aguarda a resposta do usuário
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário escolheu: ${outcome}`);
        // Limpa o prompt
        deferredPrompt = null;
        // Esconde os botões
        installBtns.forEach(b => b.classList.add('hidden'));
    });
});

window.addEventListener('appinstalled', (evt) => {
    console.log('Aplicativo instalado com sucesso!');
    installBtns.forEach(b => b.classList.add('hidden'));
});
