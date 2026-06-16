
const AlkeWallet = (() => {
  const STORAGE_KEY = 'alkeWalletState';
  const SESSION_KEY = 'alkeWalletCurrentUser';

  const defaultState = {
    users: [
      {
        id: 'usr-demo',
        name: 'Usuario Demo',
        email: 'demo@alke.cl',
        password: '123456'
      },
      {
        id: 'usr-alfonso',
        name: 'Alfonso Contreras',
        email: 'alfonso@alke.cl',
        password: 'alkemy2026'
      }
    ],
    balance: 250000,
    contacts: [
      { id: 'ctc-1', name: 'Camila Torres', account: 'ALKE-1023', email: 'camila.torres@correo.cl' },
      { id: 'ctc-2', name: 'Diego Ramírez', account: 'ALKE-2381', email: 'diego.ramirez@correo.cl' },
      { id: 'ctc-3', name: 'Valentina Rojas', account: 'ALKE-8142', email: 'valentina.rojas@correo.cl' }
    ],
    transactions: [
      {
        id: 'trx-inicial',
        type: 'deposit',
        title: 'Depósito inicial',
        detail: 'Carga inicial de la wallet',
        amount: 250000,
        createdAt: new Date().toISOString()
      }
    ]
  };

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
  }

  function getPageName() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  }

  function loadState() {
    const rawState = localStorage.getItem(STORAGE_KEY);

    if (!rawState) {
      const initialState = cloneDefaultState();
      saveState(initialState);
      return initialState;
    }

    try {
      return JSON.parse(rawState);
    } catch (error) {
      console.warn('Se restauró el estado inicial por datos inválidos.', error);
      const initialState = cloneDefaultState();
      saveState(initialState);
      return initialState;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getSession() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSession(userId) {
    localStorage.setItem(SESSION_KEY, userId);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const state = loadState();
    return state.users.find(user => user.id === getSession()) || null;
  }

  function requireSession() {
    const publicPages = ['login.html', 'index.html', ''];
    const currentPage = getPageName();

    if (!publicPages.includes(currentPage) && !getCurrentUser()) {
      window.location.replace('login.html');
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function formatDate(isoDate) {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(isoDate));
  }

  function parseAmount(value) {
    const normalized = String(value || '').replace(/[^0-9]/g, '');
    return Number(normalized);
  }

  function showMessage(selector, message, type = 'success') {
    const $box = $(selector);
    $box
      .removeClass('d-none alert-success alert-danger alert-warning alert-info')
      .addClass(`alert-${type}`)
      .text(message)
      .hide()
      .fadeIn(180);
  }

  function hideMessage(selector) {
    $(selector).addClass('d-none').text('');
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  }

  function getTypeLabel(type) {
    const labels = {
      deposit: 'Depósito',
      withdraw: 'Retiro',
      send: 'Envío'
    };

    return labels[type] || 'Movimiento';
  }

  function getSignedAmount(transaction) {
    if (transaction.type === 'deposit') {
      return transaction.amount;
    }

    return transaction.amount * -1;
  }

  function addTransaction({ type, title, detail, amount }) {
    const state = loadState();
    const transaction = {
      id: createId('trx'),
      type,
      title,
      detail,
      amount,
      createdAt: new Date().toISOString()
    };

    state.transactions.unshift(transaction);

    if (type === 'deposit') {
      state.balance += amount;
    }

    if (type === 'withdraw' || type === 'send') {
      state.balance -= amount;
    }

    saveState(state);
    renderGlobalData();
    return transaction;
  }

  function renderGlobalData() {
    const state = loadState();
    const currentUser = getCurrentUser();

    $('.js-balance').text(formatCurrency(state.balance));

    if (currentUser) {
      $('#welcomeName').text(`Hola, ${currentUser.name}`);
      $('#currentUserLabel').text(currentUser.email);
    }
  }

  function renderTransactionList(selector, transactions, limit = 5) {
    const items = transactions.slice(0, limit);
    const $container = $(selector);

    if (!items.length) {
      $container.html('<div class="empty-state">Aún no hay movimientos para mostrar.</div>');
      return;
    }

    const html = items.map(transaction => {
      const signedAmount = getSignedAmount(transaction);
      const amountClass = signedAmount >= 0 ? 'amount-positive' : 'amount-negative';
      const amountSymbol = signedAmount >= 0 ? '+' : '-';

      return `
        <article class="transaction-item compact">
          <div class="transaction-main">
            <strong>${transaction.title}</strong>
            <span>${transaction.detail}</span>
            <small>${formatDate(transaction.createdAt)}</small>
          </div>
          <div class="transaction-amount ${amountClass}">${amountSymbol}${formatCurrency(Math.abs(signedAmount))}</div>
        </article>
      `;
    }).join('');

    $container.html(html);
  }

  function initLoginPage() {
    if (getCurrentUser()) {
      window.location.replace('menu.html');
      return;
    }

    $('#loginForm').on('submit', function(event) {
      event.preventDefault();
      hideMessage('#loginMessage');

      const form = this;
      const email = $('#email').val().trim().toLowerCase();
      const password = $('#password').val().trim();
      const state = loadState();

      if (!form.checkValidity()) {
        $(form).addClass('was-validated');
        showMessage('#loginMessage', 'Revisa los datos ingresados antes de continuar.', 'danger');
        return;
      }

      const user = state.users.find(item => item.email.toLowerCase() === email && item.password === password);

      if (!user) {
        showMessage('#loginMessage', 'Credenciales incorrectas. Prueba con demo@alke.cl / 123456.', 'danger');
        return;
      }

      setSession(user.id);
      showMessage('#loginMessage', 'Ingreso correcto. Redirigiendo...', 'success');

      setTimeout(() => {
        window.location.href = 'menu.html';
      }, 550);
    });
  }

  function initMenuPage() {
    const state = loadState();

    $('#contactsCount').text(state.contacts.length);
    $('#transactionsCount').text(state.transactions.length);
    renderTransactionList('#recentTransactions', state.transactions, 5);

    $('.action-card, .panel').css('opacity', 0).each(function(index) {
      $(this).delay(index * 90).animate({ opacity: 1 }, 250);
    });
  }

  function initDepositPage() {
    const renderOwnMovements = () => {
      const state = loadState();
      const ownMovements = state.transactions.filter(transaction => ['deposit', 'withdraw'].includes(transaction.type));
      renderTransactionList('#fundsTransactions', ownMovements, 6);
    };

    renderOwnMovements();

    $('#depositForm').on('submit', function(event) {
      event.preventDefault();
      const amount = parseAmount($('#depositAmount').val());

      if (amount <= 0) {
        showMessage('#fundsMessage', 'Ingresa un monto válido para depositar.', 'danger');
        return;
      }

      addTransaction({
        type: 'deposit',
        title: 'Depósito realizado',
        detail: 'Ingreso de fondos a la wallet',
        amount
      });

      this.reset();
      showMessage('#fundsMessage', `Depósito exitoso por ${formatCurrency(amount)}.`, 'success');
      renderOwnMovements();
    });

    $('#withdrawForm').on('submit', function(event) {
      event.preventDefault();
      const state = loadState();
      const amount = parseAmount($('#withdrawAmount').val());

      if (amount <= 0) {
        showMessage('#fundsMessage', 'Ingresa un monto válido para retirar.', 'danger');
        return;
      }

      if (amount > state.balance) {
        showMessage('#fundsMessage', 'No tienes saldo suficiente para realizar este retiro.', 'warning');
        return;
      }

      addTransaction({
        type: 'withdraw',
        title: 'Retiro realizado',
        detail: 'Retiro de fondos propios',
        amount
      });

      this.reset();
      showMessage('#fundsMessage', `Retiro exitoso por ${formatCurrency(amount)}.`, 'success');
      renderOwnMovements();
    });
  }

  function renderContacts() {
    const state = loadState();
    const html = state.contacts.map(contact => `
      <article class="contact-card">
        <span class="contact-avatar" aria-hidden="true">${contact.name.charAt(0).toUpperCase()}</span>
        <div>
          <strong>${contact.name}</strong>
          <small>${contact.account} · ${contact.email}</small>
        </div>
      </article>
    `).join('');

    $('#contactsList').html(html || '<div class="empty-state">No hay contactos guardados.</div>');
  }

  function renderSuggestions(query) {
    const state = loadState();
    const cleanQuery = query.trim().toLowerCase();
    const $suggestions = $('#contactSuggestions');

    if (!cleanQuery) {
      $suggestions.addClass('d-none').empty();
      return;
    }

    const matches = state.contacts.filter(contact => {
      const source = `${contact.name} ${contact.account} ${contact.email}`.toLowerCase();
      return source.includes(cleanQuery);
    }).slice(0, 5);

    if (!matches.length) {
      $suggestions
        .removeClass('d-none')
        .html('<div class="suggestion-item text-muted">No se encontraron contactos.</div>');
      return;
    }

    const html = matches.map(contact => `
      <button class="suggestion-item" type="button" data-contact-id="${contact.id}">
        <strong>${contact.name}</strong>
        <small>${contact.account} · ${contact.email}</small>
      </button>
    `).join('');

    $suggestions.removeClass('d-none').html(html);
  }

  function selectContact(contactId) {
    const state = loadState();
    const contact = state.contacts.find(item => item.id === contactId);

    if (!contact) {
      return;
    }

    $('#selectedContactId').val(contact.id);
    $('#contactSearch').val(`${contact.name} · ${contact.account}`);
    $('#contactSuggestions').addClass('d-none').empty();
  }

  function initSendMoneyPage() {
    renderContacts();

    $('#contactSearch').on('input', function() {
      $('#selectedContactId').val('');
      renderSuggestions($(this).val());
    });

    $('#contactSuggestions').on('click', '.suggestion-item[data-contact-id]', function() {
      selectContact($(this).data('contact-id'));
    });

    $(document).on('click', function(event) {
      if (!$(event.target).closest('#contactSearch, #contactSuggestions').length) {
        $('#contactSuggestions').addClass('d-none');
      }
    });

    $('#contactForm').on('submit', function(event) {
      event.preventDefault();

      const name = $('#contactName').val().trim();
      const account = $('#contactAccount').val().trim();
      const email = $('#contactEmail').val().trim();

      if (!name || !account || !email) {
        showMessage('#sendMessage', 'Completa todos los datos del contacto.', 'danger');
        return;
      }

      const state = loadState();
      state.contacts.unshift({
        id: createId('ctc'),
        name,
        account,
        email
      });
      saveState(state);

      this.reset();
      renderContacts();
      showMessage('#sendMessage', 'Contacto agregado correctamente.', 'success');
    });

    $('#sendMoneyForm').on('submit', function(event) {
      event.preventDefault();

      const state = loadState();
      const contactId = $('#selectedContactId').val();
      const amount = parseAmount($('#transferAmount').val());
      const note = $('#transferNote').val().trim();
      const contact = state.contacts.find(item => item.id === contactId);

      if (!contact) {
        showMessage('#sendMessage', 'Selecciona un contacto desde el autocompletado.', 'danger');
        return;
      }

      if (amount <= 0) {
        showMessage('#sendMessage', 'Ingresa un monto válido para enviar.', 'danger');
        return;
      }

      if (amount > state.balance) {
        showMessage('#sendMessage', 'Saldo insuficiente para realizar la transferencia.', 'warning');
        return;
      }

      addTransaction({
        type: 'send',
        title: `Transferencia a ${contact.name}`,
        detail: note || `Envío a ${contact.account}`,
        amount
      });

      this.reset();
      $('#selectedContactId').val('');
      showMessage('#sendMessage', `Transferencia enviada a ${contact.name} por ${formatCurrency(amount)}.`, 'success');
    });
  }

  function renderTransactionsTable() {
    const state = loadState();
    const searchValue = $('#transactionSearch').val().trim().toLowerCase();
    const typeValue = $('#typeFilter').val();

    let transactions = [...state.transactions];

    if (typeValue !== 'all') {
      transactions = transactions.filter(transaction => transaction.type === typeValue);
    }

    if (searchValue) {
      transactions = transactions.filter(transaction => {
        const signedAmount = String(Math.abs(getSignedAmount(transaction)));
        const source = `${transaction.title} ${transaction.detail} ${getTypeLabel(transaction.type)} ${signedAmount}`.toLowerCase();
        return source.includes(searchValue);
      });
    }

    $('#resultCount').text(`${transactions.length} registro${transactions.length === 1 ? '' : 's'}`);

    if (!transactions.length) {
      $('#transactionsTableBody').html(`
        <tr>
          <td colspan="4">
            <div class="empty-state">No hay movimientos que coincidan con los filtros.</div>
          </td>
        </tr>
      `);
      return;
    }

    const html = transactions.map(transaction => {
      const signedAmount = getSignedAmount(transaction);
      const amountClass = signedAmount >= 0 ? 'amount-positive' : 'amount-negative';
      const amountSymbol = signedAmount >= 0 ? '+' : '-';

      return `
        <tr>
          <td>${formatDate(transaction.createdAt)}</td>
          <td>
            <strong>${transaction.title}</strong><br>
            <small class="text-muted">${transaction.detail}</small>
          </td>
          <td><span class="type-badge type-${transaction.type}">${getTypeLabel(transaction.type)}</span></td>
          <td class="text-end ${amountClass}"><strong>${amountSymbol}${formatCurrency(Math.abs(signedAmount))}</strong></td>
        </tr>
      `;
    }).join('');

    $('#transactionsTableBody').html(html);
  }

  function initTransactionsPage() {
    renderTransactionsTable();

    $('#transactionSearch').on('input', renderTransactionsTable);
    $('#typeFilter').on('change', renderTransactionsTable);
    $('#clearFilters').on('click', function() {
      $('#transactionSearch').val('');
      $('#typeFilter').val('all');
      renderTransactionsTable();
    });
  }

  function bindGlobalEvents() {
    $('[data-action="logout"]').on('click', function() {
      clearSession();
      window.location.href = 'login.html';
    });
  }

  function init() {
    const currentPage = getPageName();
    loadState();
    requireSession();
    bindGlobalEvents();
    renderGlobalData();

    const pageInitializers = {
      'login.html': initLoginPage,
      'menu.html': initMenuPage,
      'deposit.html': initDepositPage,
      'sendmoney.html': initSendMoneyPage,
      'transactions.html': initTransactionsPage
    };

    if (pageInitializers[currentPage]) {
      pageInitializers[currentPage]();
    }
  }

  return {
    init,
    formatCurrency
  };
})();

$(document).ready(function() {
  AlkeWallet.init();
});
