const API_BASE_URL = 'http://192.168.100.62:8082';

document.addEventListener('DOMContentLoaded', () => {
    
    // Riferimenti DOM
    const btnCreditTransfers = document.getElementById('btn-credit-transfers');
    const mainContent = document.getElementById('main-content');

    // Event Listener al click del menu
    if(btnCreditTransfers){
        btnCreditTransfers.addEventListener('click', (e) => {
            e.preventDefault(); // Evita il reload della pagina
            loadTransfers(0);   // Carica la prima pagina
        });
    }

    /**
     * Effettua la chiamata GET /transfers
     */
    function loadTransfers(pageNumber) {
        const size = 10; // Elementi per pagina
        
        // Spinner di caricamento
        mainContent.innerHTML = `
            <div class="text-center mt-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p>Caricamento bonifici in corso...</p>
            </div>`;

        fetch(`${API_BASE_URL}/transfers?page=${pageNumber}&size=${size}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Errore HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(pageData => {
                renderTable(pageData);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                mainContent.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <strong>Errore:</strong> Impossibile contattare il server (${API_BASE_URL}). 
                        <br>Verifica che il backend sia attivo e che il CORS sia abilitato.
                        <br><small>${error.message}</small>
                    </div>`;
            });
    }

    /**
     * Disegna la tabella HTML basata sul DTO TransferSummaryResponse
     */
    function renderTable(pageData) {
        const transfers = pageData.content; // Spring Page mette la lista in 'content'

        if (!transfers || transfers.length === 0) {
            mainContent.innerHTML = '<div class="alert alert-info">Nessun bonifico trovato.</div>';
            return;
        }

        // Intestazione Tabella
        let html = `
            <h3>Lista Bonifici</h3>
            <div class="table-responsive">
                <table class="table table-striped table-hover align-middle">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>Data Creazione</th>
                            <th>Beneficiario</th>
                            <th>Tipo</th>
                            <th>Importo</th>
                            <th>Stato</th>
                            <th class="text-center">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Ciclo sui dati (DTO: TransferSummaryResponse)
        transfers.forEach(t => {
            // Formattazione Data
            const dateObj = new Date(t.createdAt);
            const dateStr = dateObj.toLocaleString('it-IT');

            // Formattazione Valuta
            const amountStr = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(t.amount);

            // Logica Bottoni (Solo se CREATED)
            let buttons = '';
            if (t.status === 'CREATED') {
                buttons = `
                    <button class="btn btn-success btn-sm me-1" onclick="executeTransfer(${t.transferId})">Esegui</button>
                    <button class="btn btn-danger btn-sm" onclick="revokeTransfer(${t.transferId})">Revoca</button>
                `;
            } else {
                buttons = '<span class="text-muted small">Nessuna azione</span>';
            }

            html += `
                <tr>
                    <td>#${t.transferId}</td>
                    <td>${dateStr}</td>
                    <td><strong>${t.beneficiaryName}</strong></td>
                    <td>${t.type || '-'}</td>
                    <td class="fw-bold text-primary">${amountStr}</td>
                    <td><span class="badge ${getStatusClass(t.status)}">${t.status}</span></td>
                    <td class="text-center">${buttons}</td>
                </tr>
            `;
        });

        html += `   </tbody>
                </table>
            </div>`;

        // Paginazione
        html += buildPagination(pageData);

        mainContent.innerHTML = html;

        // Riagganciamo i listener per la paginazione
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if(prevBtn && !pageData.first) {
            prevBtn.addEventListener('click', () => loadTransfers(pageData.number - 1));
        }
        if(nextBtn && !pageData.last) {
            nextBtn.addEventListener('click', () => loadTransfers(pageData.number + 1));
        }
    }

    /**
     * Genera l'HTML per i pulsanti Avanti/Indietro
     */
    function buildPagination(pageData) {
        return `
            <nav>
                <ul class="pagination justify-content-center">
                    <li class="page-item ${pageData.first ? 'disabled' : ''}">
                        <button class="page-link" id="btn-prev">Precedente</button>
                    </li>
                    <li class="page-item disabled">
                        <span class="page-link">Pagina ${pageData.number + 1} di ${pageData.totalPages}</span>
                    </li>
                    <li class="page-item ${pageData.last ? 'disabled' : ''}">
                        <button class="page-link" id="btn-next">Successivo</button>
                    </li>
                </ul>
            </nav>
        `;
    }

    /**
     * Utility per i colori delle badge in base allo stato
     */
    function getStatusClass(status) {
        switch (status) {
            case 'CREATED': return 'text-bg-warning';
            case 'COMPLETED': return 'text-bg-success';
            case 'FAILED': return 'text-bg-danger';
            case 'REVOKED': return 'text-bg-secondary';
            default: return 'text-bg-secondary';
        }
    }
});

// FUNZIONI GLOBALI PER I BOTTONI NELLA TABELLA

// Esegui Bonifico
window.executeTransfer = function(id) {
    if(!confirm('Sei sicuro di voler eseguire il bonifico #' + id + '?')) return;

    fetch(`${API_BASE_URL}/transfers/${id}/execute`, { method: 'POST' })
        .then(async res => {
            if (res.ok) {
                alert('Bonifico eseguito con successo!');
                // Ricarica la lista simulando il click
                document.getElementById('btn-credit-transfers').click();
            } else {
                const err = await res.json(); // Se il backend torna un JSON di errore
                alert('Errore: ' + (err.message || 'Impossibile eseguire'));
            }
        })
        .catch(err => alert('Errore di comunicazione: ' + err));
};

// Revoca Bonifico
window.revokeTransfer = function(id) {
    if(!confirm('Vuoi revocare il bonifico #' + id + '?')) return;

    fetch(`${API_BASE_URL}/transfers/${id}/revoke`, { method: 'PUT' })
        .then(res => {
            if (res.ok) {
                alert('Bonifico revocato.');
                document.getElementById('btn-credit-transfers').click();
            } else {
                alert('Errore durante la revoca.');
            }
        })
        .catch(err => alert('Errore di comunicazione: ' + err));
};