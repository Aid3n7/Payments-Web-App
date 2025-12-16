// CONFIGURAZIONE API
const API_IP = "192.168.100.62";
const API_PORT = "8082";
const BASE_URL = `http://${API_IP}:${API_PORT}`;

// STATO GLOBALE
let allTransfers = []; // Per la ricerca locale
let currentPage = 0;
let totalPages = 0;
const pageSize = 20;

// AVVIO
document.addEventListener("DOMContentLoaded", () => {
    loadTransfers(0);
});

// --- 1. CARICAMENTO DATI (GET) ---
async function loadTransfers(page) {
    const tableBody = document.getElementById("transferTableBody");
    const pagInfo = document.getElementById("paginationInfo");
    
    // Spinner
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;
    
    try {
        const response = await fetch(`${BASE_URL}/transfers?page=${page}&size=${pageSize}`);
        
        if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
        
        const data = await response.json();
        
        // Aggiorna stato
        allTransfers = data.content || [];
        totalPages = data.totalPages;
        currentPage = data.number;

        // Renderizza
        renderTable(allTransfers);
        updatePaginationUI(data);

    } catch (error) {
        console.error("Errore Fetch:", error);
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4"><strong>Errore:</strong> ${error.message}</td></tr>`;
    }
}

// --- 2. RENDERIZZAZIONE TABELLA ---
function renderTable(transfers) {
    const tableBody = document.getElementById("transferTableBody");
    tableBody.innerHTML = "";

    if (!transfers || transfers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Nessun bonifico trovato.</td></tr>`;
        return;
    }

    transfers.forEach(t => {
        // Gestione Colore Stato
        let badgeClass = "bg-secondary";
        switch(t.status) {
            case "COMPLETED": badgeClass = "bg-success"; break;
            case "FAILED":    badgeClass = "bg-danger"; break;
            case "CREATED":   badgeClass = "bg-primary"; break;
            case "PENDING":   badgeClass = "bg-warning text-dark"; break;
        }

        // Formattazioni
        const amountFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(t.amount);
        const dateFmt = t.createdAt ? new Date(t.createdAt).toLocaleString('it-IT') : "-";

        // Bottoni Azioni (Solo se CREATED)
        let actions = '<span class="text-muted small">-</span>';
        if (t.status === 'CREATED') {
            actions = `
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-outline-success" title="Esegui" onclick="executeTransfer(${t.transferId})">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Revoca" onclick="revokeTransfer(${t.transferId})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
        }

        const row = `
            <tr>
                <td class="fw-bold">#${t.transferId}</td>
                <td>${t.beneficiaryName || 'Sconosciuto'}</td>
                <td><span class="badge bg-light text-dark border">${t.type || 'N/A'}</span></td>
                <td><span class="badge ${badgeClass} badge-status">${t.status}</span></td>
                <td class="text-end amount-text">${amountFmt}</td>
                <td class="text-end small text-muted">${dateFmt}</td>
                <td class="text-center">${actions}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// --- 3. AZIONI (EXECUTE / REVOKE / CREATE) ---

async function executeTransfer(id) {
    if(!confirm(`Eseguire bonifico #${id}?`)) return;
    callApi(`${BASE_URL}/transfers/${id}/execute`, 'POST', "Bonifico Eseguito!");
}

async function revokeTransfer(id) {
    if(!confirm(`Revocare bonifico #${id}?`)) return;
    callApi(`${BASE_URL}/transfers/${id}/revoke`, 'PUT', "Bonifico Revocato!");
}

async function callApi(url, method, successMsg) {
    try {
        const res = await fetch(url, { method: method });
        if(res.ok) {
            alert(successMsg);
            loadTransfers(currentPage);
        } else {
            const err = await res.json();
            alert("Errore: " + (err.message || "Operazione fallita"));
        }
    } catch(e) {
        alert("Errore di connessione");
    }
}

async function submitTransfer() {
    const form = document.getElementById("createTransferForm");
    const formData = new FormData(form);
    const jsonData = {};
    formData.forEach((value, key) => jsonData[key] = value);

    if(jsonData.amount <= 0) { alert("L'importo deve essere maggiore di 0"); return; }

    try {
        const response = await fetch(`${BASE_URL}/transfers/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
        });

        if (response.ok) {
            alert("Bonifico Creato!");
            // Chiudi modale usando l'istanza Bootstrap
            const modalEl = document.getElementById('createTransferModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            
            form.reset();
            loadTransfers(0);
        } else {
            const err = await response.json();
            alert("Errore creazione: " + (err.message || "Dati non validi"));
        }
    } catch (e) {
        console.error(e);
        alert("Errore di comunicazione col server");
    }
}

// --- 4. FILTRI E PAGINAZIONE ---
function searchById() {
    const val = document.getElementById("searchInput").value;
    if (!val) {
        renderTable(allTransfers);
        return;
    }
    const filtered = allTransfers.filter(t => t.transferId == val);
    renderTable(filtered);
}

function resetSearch() {
    document.getElementById("searchInput").value = "";
    renderTable(allTransfers);
}

function changePage(dir) {
    const newPage = currentPage + dir;
    if (newPage >= 0 && newPage < totalPages) {
        loadTransfers(newPage);
    }
}

function updatePaginationUI(data) {
    const info = document.getElementById("paginationInfo");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");

    info.innerText = `Pagina ${data.number + 1} di ${data.totalPages} (Totale: ${data.totalElements})`;
    
    // toggle 'disabled' class
    if(data.first) btnPrev.parentElement.classList.add("disabled");
    else btnPrev.parentElement.classList.remove("disabled");

    if(data.last) btnNext.parentElement.classList.add("disabled");
    else btnNext.parentElement.classList.remove("disabled");
}