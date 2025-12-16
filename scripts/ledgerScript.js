    // CONFIGURAZIONE API
    const API_IP = "192.168.100.62";
    const API_PORT = "8082";
    const BASE_URL = `http://${API_IP}:${API_PORT}`;

    // VARIABILE GLOBALE PER I DATI
    // Serve per memorizzare i dati scaricati e poterli filtrare senza richiamare l'API
    let allTransactions = []; 

    // 1. Funzione per SCARICARE i dati (Fetch)
    async function getEntries() {
        const tbody = document.getElementById('ledgerTableBody');
        const paginationInfo = document.getElementById('paginationInfo');
        
        // Pulisce la ricerca quando si aggiorna
        document.getElementById('searchInput').value = ''; 
        
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><br>Caricamento...</td></tr>';

        try {
            const response = await fetch(`${BASE_URL}/ledger/accounts/entries?page=0&size=20`);

            if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);

            const data = await response.json();
            
            // Salviamo i dati nella variabile globale
            allTransactions = data.content || [];

            // Aggiorniamo le info di paginazione
            paginationInfo.innerText = `Pagina ${data.number + 1} di ${data.totalPages} (Totale elementi: ${data.totalElements})`;

            // Chiamiamo la funzione che disegna la tabella
            renderTable(allTransactions);

        } catch (error) {
            console.error('Errore Fetch:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle-fill"></i> <strong>Errore:</strong> ${error.message}
            </td></tr>`;
        }
    }

    // 2. Funzione per DISEGNARE la tabella (Render)
    function renderTable(transactions) {
        const tbody = document.getElementById('ledgerTableBody');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Nessuna transazione trovata.</td></tr>';
            return;
        }

        transactions.forEach(entry => {
            // Formattazione Data
            const dateObj = new Date(entry.bookingDate);
            const dateFormatted = dateObj.toLocaleDateString('it-IT') + ' <small class="text-muted">' + dateObj.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) + '</small>';

            // Gestione Stile
            const amountClass = entry.direction === 'DEBIT' ? 'amount-debit' : 'amount-credit';
            const sign = entry.direction === 'DEBIT' ? '-' : '+';
            const btnDisabled = entry.reversal === true ? 'disabled' : '';

            const row = `
                <tr>
                    <td class="fw-bold">#${entry.transactionId}</td>
                    <td>${dateFormatted}</td>
                    <td>
                        <span class="badge bg-secondary badge-type">${entry.type.replace('_', ' ')}</span>
                        <div style="font-size: 10px; color: #666;">Ref: ${entry.externalReference || '-'}</div>
                    </td>
                    <td>${entry.description}</td>
                    <td class="text-end ${amountClass}">
                        ${sign} ${entry.amount.toFixed(2)} ${entry.currency}
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger" 
                            onclick="reverseEntry(${entry.transactionId})" ${btnDisabled} title="Storna">
                            <i class="bi bi-arrow-counterclockwise"></i> Storna
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }

    // 3. Funzione di RICERCA (Filtra la lista locale)
    function searchById() {
        const searchValue = document.getElementById('searchInput').value;

        if (!searchValue) {
            // Se il campo è vuoto, mostra tutto
            renderTable(allTransactions);
            return;
        }

        // Filtra l'array 'allTransactions' cercando l'ID
        // Nota: == funziona anche se uno è stringa e l'altro numero
        const filteredData = allTransactions.filter(t => t.transactionId == searchValue);
        
        renderTable(filteredData);
    }

    // 4. Funzione RESET ricerca
    function resetSearch() {
        document.getElementById('searchInput').value = '';
        renderTable(allTransactions); // Ripristina la lista completa
    }

    // 5. Funzione per Stornare (POST)
    async function reverseEntry(transactionId) {
        if (!confirm(`Sei sicuro di voler stornare la transazione #${transactionId}?`)) return;

        try {
            const response = await fetch(`${BASE_URL}/ledger/accounts/entries/${transactionId}/reversal`, {
                method: 'POST'
            });

            if (response.ok) {
                alert("Storno effettuato con successo!");
                getEntries(); // Ricarica tutto
            } else {
                const errText = await response.text();
                alert("Errore durante lo storno: " + errText);
            }
        } catch (error) {
            console.error(error);
            alert("Errore di connessione API");
        }
    }

    // Carica all'avvio
    window.addEventListener('DOMContentLoaded', getEntries);