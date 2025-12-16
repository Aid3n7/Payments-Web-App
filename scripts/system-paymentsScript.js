// CONFIGURAZIONE
const API_IP = "192.168.100.62"; // Assicurati che questo IP sia corretto
const API_PORT = "8082";
const BASE_URL = `http://${API_IP}:${API_PORT}`;

console.log("System Payments JS Caricato. Base URL:", BASE_URL);

// --- 1. CARICA TUTTI I PAGAMENTI ---
async function loadAllPayments() {
    console.log("Avvio caricamento pagamenti...");
    const searchInput = document.getElementById('searchAccountId');
    if (searchInput) searchInput.value = ''; 
    await fetchPayments(`${BASE_URL}/system-payments/accounts/payments`);
}

// --- 2. CERCA PER ACCOUNT ID ---
async function searchByAccount() {
    const accountId = document.getElementById('searchAccountId').value;
    if (!accountId) {
        alert("Inserisci un Account ID valido.");
        return;
    }
    console.log("Ricerca per Account ID:", accountId);
    await fetchPayments(`${BASE_URL}/system-payments/accounts/${accountId}`);
}

// --- 3. FUNZIONE CORE: CHIAMATA GET E RENDER TABELLA ---
async function fetchPayments(url) {
    const tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br>Caricamento dati...</td></tr>';

    try {
        console.log("Fetching URL:", url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Errore Server: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Dati ricevuti:", data); // <--- CONTROLLA QUESTO IN CONSOLE
        
        // Verifica se è un array
        const list = Array.isArray(data) ? data : [];
        
        tbody.innerHTML = ''; 

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><i>Nessun pagamento trovato.</i></td></tr>';
            return;
        }

        list.forEach(p => {
            // Logica colori stato
            let badgeClass = 'bg-secondary';
            const status = p.status ? p.status.toUpperCase() : 'UNKNOWN';

            if (status === 'CREATED') badgeClass = 'status-created badge';
            else if (status === 'PENDING') badgeClass = 'status-pending badge';
            else if (status === 'EXECUTED') badgeClass = 'status-executed badge';
            else if (status === 'FAILED') badgeClass = 'status-failed badge';
            else if (status === 'CANCELLED') badgeClass = 'status-cancelled badge';

            // Logica colori importo
            const isDebit = p.direction === 'DEBIT';
            const amountClass = isDebit ? 'amount-debit' : 'amount-credit';
            const sign = isDebit ? '-' : '+';
            
            // Data
            const date = p.createdAt ? new Date(p.createdAt).toLocaleString('it-IT') : '-';
            
            // --- PUNTO CRITICO: L'ID ---
            // Cerchiamo l'ID in vari campi possibili.
            // Se l'API non restituisce l'ID, il bottone Azioni sarà disabilitato.
            const payId = p.paymentId || p.id || p.transactionId; 
            
            if (!payId) {
                console.warn("ATTENZIONE: Nessun ID trovato per questo pagamento:", p);
            }

            const btnDisabled = !payId ? 'disabled' : '';
            const btnTitle = !payId ? 'ID mancante dal server' : 'Gestisci stato';

            const row = `
                <tr>
                    <td class="fw-bold text-secondary">#${p.accountId}</td>
                    <td><small>${date}</small></td>
                    <td>${p.externalReferenceId || '<span class="text-muted">-</span>'}</td>
                    <td>${p.description || ''}</td>
                    <td class="text-end ${amountClass}">
                        ${sign} ${parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td class="text-center"><span class="${badgeClass} px-2 py-1 rounded-pill">${status}</span></td>
                    <td class="text-end">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" ${btnDisabled} title="${btnTitle}">
                                <i class="bi bi-gear"></i> Azioni
                            </button>
                            <ul class="dropdown-menu shadow">
                                <li><h6 class="dropdown-header">Cambia Stato (ID: ${payId})</h6></li>
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${payId}, 'EXECUTED')"><i class="bi bi-check-circle text-success me-2"></i> Execute</a></li>
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${payId}, 'FAILED')"><i class="bi bi-x-circle text-danger me-2"></i> Fail</a></li>
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${payId}, 'CANCELLED')"><i class="bi bi-dash-circle text-muted me-2"></i> Cancel</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${payId}, 'PENDING')">Set Pending</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

    } catch (error) {
        console.error("Errore Fetch:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle"></i> Errore: ${error.message}<br><small>Controlla la console (F12)</small></td></tr>`;
    }
}

// --- 4. CREA NUOVO PAGAMENTO (POST) ---
async function createPayment() {
    const accountId = document.getElementById('newAccountId').value;
    const amount = document.getElementById('newAmount').value;
    
    if (!accountId || !amount) {
        alert("Compila Account ID e Importo.");
        return;
    }

    const payload = {
        accountId: parseInt(accountId),
        amount: parseFloat(amount),
        direction: document.getElementById('newDirection').value,
        description: document.getElementById('newDesc').value,
        externalReferenceId: document.getElementById('newRef').value,
        status: document.getElementById('newStatus').value
    };

    console.log("Invio payload creazione:", payload);

    try {
        const response = await fetch(`${BASE_URL}/system-payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Pagamento creato!");
            
            // CORREZIONE BUG MODAL: Usiamo getOrCreateInstance
            const modalEl = document.getElementById('createPaymentModal');
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.hide();
            
            document.getElementById('createForm').reset();
            loadAllPayments();
        } else {
            const errText = await response.text();
            alert("Errore Server: " + errText);
        }
    } catch (error) {
        console.error(error);
        alert("Errore di connessione.");
    }
}

// --- 5. AGGIORNA STATO (PUT) ---
async function updateStatus(id, newStatus) {
    if(!id) {
        alert("ID mancante, impossibile aggiornare.");
        return;
    }
    
    console.log(`Aggiornamento ID ${id} allo stato ${newStatus}`);

    try {
        const response = await fetch(`${BASE_URL}/system-payments/${id}/status?status=${newStatus}`, {
            method: 'PUT'
        });

        if (response.ok) {
            // alert("Stato aggiornato!"); // Opzionale, rimosso per velocità
            loadAllPayments(); 
        } else {
            const errText = await response.text();
            alert("Errore aggiornamento: " + errText);
        }
    } catch (error) {
        console.error(error);
        alert("Errore di rete.");
    }
}

// AVVIO
document.addEventListener('DOMContentLoaded', loadAllPayments);