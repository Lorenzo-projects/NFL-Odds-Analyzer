class UI {
    constructor() {
        this.sportButtons = document.querySelectorAll('.nav-btn');
        this.eventCards = document.getElementById('event-cards');
        this.oddsTable = document.getElementById('odds-table');
        this.loading = document.getElementById('loading');
        this.recommendations = document.getElementById('recommendations');
        this.dashboardSection = document.getElementById('dashboard');
        this.analysisSection = document.getElementById('analysis');
        this.insightsSection = document.getElementById('insights');
        this.infoSection = document.getElementById('info');
        this.languageSelect = document.getElementById('language-select');

        this.currentLanguage = localStorage.getItem('language') || 'en'; // Changed default to English
        this.languageSelect.value = this.currentLanguage;

        this.loadTranslations();
        this.initializeEventListeners();
        this.showSection('dashboard'); // Show dashboard by default
        this.loadSportData('nfl'); // Load NFL data by default
    }

    loadTranslations() {
        this.translations = translations[this.currentLanguage];
    }

    translate(key) {
        return this.translations[key] || key;
    }

    initializeEventListeners() {
        this.sportButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.setActiveButton(button);
                this.showSection(button.dataset.section);
                if (button.dataset.section !== 'info') {
                    this.loadSportData('nfl');
                }
            });
        });

        // Quote probability filter
        const probabilityFilter = document.getElementById('probabilityFilter');
        if (probabilityFilter) {
            probabilityFilter.addEventListener('change', () => {
                this.filterOddsTable(probabilityFilter.value);
            });
        }

        this.languageSelect.addEventListener('change', () => {
            this.currentLanguage = this.languageSelect.value;
            localStorage.setItem('language', this.currentLanguage);
            this.loadTranslations();
            this.translatePage();
            // Aggiorna dinamicamente le sezioni già renderizzate
            this.updateDynamicTranslations();
        });
    }

    setActiveButton(activeButton) {
        this.sportButtons.forEach(button => button.classList.remove('active'));
        activeButton.classList.add('active');
    }

    showSection(sectionId) {
        this.dashboardSection.classList.add('hidden');
        this.analysisSection.classList.add('hidden');
        this.insightsSection.classList.add('hidden');
        this.infoSection.classList.add('hidden');

        document.getElementById(sectionId).classList.remove('hidden');
    }

    showLoading() {
        this.loading.classList.remove('hidden');
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }

    async loadSportData(sport) {
        // Simple API call rate limiting: cache results for 10 minutes per sport
        if (!this._apiCache) this._apiCache = {};
        const cacheKey = sport;
        const now = Date.now();
        const cacheDuration = 60 * 60 * 1000; // 1 hour

        if (
            this._apiCache[cacheKey] &&
            now - this._apiCache[cacheKey].timestamp < cacheDuration
        ) {
            // Use cached data
            const data = this._apiCache[cacheKey].data;
            this.renderEventCards(data);
            this.renderOddsTable(data);
            this.renderRecommendations(data);
            this.showMessage(this.translate('Data updated successfully'), 'success');
            return;
        }

        this.showLoading();
        console.log('Loading data for sport:', sport);

        try {
            const data = await api.fetchOdds(sport);
            
            if (!data) {
                throw new Error(this.translate("Odds not available"));
            }

            // Cache the result
            this._apiCache[cacheKey] = {
                data,
                timestamp: Date.now()
            };

            this.renderEventCards(data);
            this.renderOddsTable(data);
            this.renderRecommendations(data);
            this.showMessage(this.translate('Data updated successfully'), 'success');

        } catch (error) {
            console.error('Error loading sport data:', error);
            this.showMessage(this.translate("Error loading data") + ": " + error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderNoDataAvailable() {
        const message = this.translate("No odds available for NFL");
        this.eventCards.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>${message}</p>
            </div>`;
        this.oddsTable.innerHTML = '';
    }

    renderError(message) {
        this.eventCards.innerHTML = `
            <div class="no-data-message error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>`;
        this.oddsTable.innerHTML = '';
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => messageDiv.remove(), 3000);
    }

    renderEventCards(events) {
        this._lastEventCardsEvents = events;
        if (!events || events.length === 0) {
            this.eventCards.innerHTML = '<div class="no-data-message">' + this.translate("Odds not available") + '</div>';
            return;
        }

        // Filtra solo eventi che hanno almeno una quota disponibile
        const availableEvents = events.filter(event =>
            Array.isArray(event.bookmakers) &&
            event.bookmakers.some(b => Array.isArray(b.markets) && b.markets.some(m => Array.isArray(m.outcomes) && m.outcomes.length > 0))
        );

        if (availableEvents.length === 0) {
            this.eventCards.innerHTML = '<div class="no-data-message">' + this.translate("Odds not available") + '</div>';
            return;
        }

        this.eventCards.innerHTML = availableEvents.map(event => {
            // Trova la squadra favorita per l'evento
            let winner = null;
            let maxProb = -1;
            const outcomes = [];
            event.bookmakers.forEach(b => {
                if (b.markets && b.markets[0] && b.markets[0].outcomes) {
                    b.markets[0].outcomes.forEach(o => {
                        if (o && typeof o.price === 'number') {
                            outcomes.push({
                                name: o.name,
                                price: o.price
                            });
                        }
                    });
                }
            });
            outcomes.forEach(o => {
                const prob = o.price > 0 ? (1 / o.price) * 100 : 0;
                if (prob > maxProb) {
                    maxProb = prob;
                    winner = o.name;
                }
            });

            // Prepara i nomi delle squadre con badge se favorita
            let homeHtml = event.home_team;
            let awayHtml = event.away_team;
            if (winner === event.home_team) {
                homeHtml = `<span><b>${event.home_team}</b><span class="Favorite-badge">${this.translate("Favorite")}</span></span>`;
                awayHtml = `<span>${event.away_team}</span>`;
            } else if (winner === event.away_team) {
                homeHtml = `<span>${event.home_team}</span>`;
                awayHtml = `<span><b>${event.away_team}</b><span class="Favorite-badge">${this.translate("Favorite")}</span></span>`;
            } else {
                homeHtml = `<span>${event.home_team}</span>`;
                awayHtml = `<span>${event.away_team}</span>`;
            }

            const analyses = analyzer.analyzeEvent(event);
            // Format time with timezone
            const eventDate = new Date(event.commence_time);
            const timeZone = 'UTC';
            const timeString = eventDate.toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
            return `
                <div class="event-card">
                    <div class="event-header">
                        <div class="event-teams">
                            <div class="team-row">${homeHtml}</div>
                            <div class="vs-row">vs</div>
                            <div class="team-row">${awayHtml}</div>
                        </div>
                        <span class="event-time">${timeString} <span style="font-size:0.95em;opacity:0.7;">(UTC)</span></span>
                    </div>
                    <div class="odds-analysis">
                        ${this.renderAnalyses(analyses)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAnalyses(analyses) {
        return analyses.map(analysis => `
            <div class="outcome-analysis ${this.getProbabilityClass(analysis.impliedProbability)}">
                <div class="outcome-name">${analysis.outcome}</div>
                <div class="stats">
                    <div class="stat-prob">${this.translate("Probability:")} ${analysis.impliedProbability}%</div>
                    <div class="stat-odds">${this.translate("Average Odds:")} ${analysis.averageOdds}</div>
                    <div class="stat-consensus">${this.translate("Consensus:")} ${analysis.consensus.toFixed(0)}%</div>
                    <div class="stat-bookmakers">${this.translate("Bookmakers:")} ${analysis.bookmakerCount}</div>
                </div>
            </div>
        `).join('');
    }

    getProbabilityClass(probability) {
        const prob = parseFloat(probability);
        if (prob >= 70) return 'high-probability';
        if (prob >= 40) return 'medium-probability';
        return 'low-probability';
    }

    renderOddsTable(events) {
        this._lastOddsTableEvents = events;

        // Trova la squadra favorita per ogni evento
        const analysesArr = events.map(event => {
            // Prendi tutte le outcomes con probabilità calcolata
            const outcomes = [];
            event.bookmakers.forEach(b => {
                if (b.markets && b.markets[0] && b.markets[0].outcomes) {
                    b.markets[0].outcomes.forEach(o => {
                        if (o && typeof o.price === 'number') {
                            outcomes.push({
                                name: o.name,
                                price: o.price
                            });
                        }
                    });
                }
            });
            // Calcola la probabilità implicita per ogni outcome
            const outcomeProbs = outcomes.map(o => ({
                name: o.name,
                prob: o.price > 0 ? (1 / o.price) * 100 : 0
            }));
            // Trova la squadra con la probabilità più alta
            let Favorite = null;
            let maxProb = -1;
            outcomeProbs.forEach(o => {
                if (o.prob > maxProb) {
                    maxProb = o.prob;
                    Favorite = o.name;
                }
            });
            return { Favorite };
        });

        this.oddsTable.innerHTML = `<table class="odds-table">
            <thead>
                <tr>
                    <th>Event</th>
                    <th>Best Odds</th>
                    <th>Probability</th>
                    <th>Consensus</th>
                </tr>
            </thead>
            <tbody>
                ${this.generateOddsTableRows(events, 'all', analysesArr)}
            </tbody>
        </table>`;
    }

    generateOddsTableRows(events, filter = 'all', analysesArr = []) {
        const validRows = [];
        const naRows = [];
        let rowIndex = 0;

        events.forEach(event => {
            const analysis = analyzer.analyzeOdds(
                event.bookmakers.map(b => b.markets[0]?.outcomes[0]?.price).filter(Boolean)
            );
            let probClass = '';
            let prob = parseFloat(analysis.probability);
            if (!isNaN(prob)) {
                if (prob >= 70) probClass = 'high-probability';
                else if (prob >= 50) probClass = 'medium-probability';
                else probClass = 'low-probability';
            }

            // Filtering logic
            if (filter === 'high' && !(prob >= 70)) return;
            if (filter === 'medium' && !(prob >= 50 && prob < 70)) return;
            if (filter === 'low' && !(prob < 50)) return;

            // Evidenzia la squadra favorita
            let Favorite = analysesArr && analysesArr[rowIndex] ? analysesArr[rowIndex].Favorite : null;
            let home = event.home_team;
            let away = event.away_team;

            let homeHtml = home;
            let awayHtml = away;

            if (Favorite === home) {
                homeHtml = `<span class="Favorite-badge">${this.translate("Favorite")}</span><b>${home}</b>`;
            } else if (Favorite === away) {
                awayHtml = `<span class="Favorite-badge">${this.translate("Favorite")}</span><b>${away}</b>`;
            }

            const rowHtml = `
                <tr class="${probClass}">
                    <td>
                        <div class="event-teams">
                            <span class="team-cell">${homeHtml}</span>
                            <span class="vs-cell">vs</span>
                            <span class="team-cell">${awayHtml}</span>
                        </div>
                    </td>
                    <td>${analysis.averageOdds}</td>
                    <td>${analysis.probability}%</td>
                    <td>${analysis.consensus}%</td>
                </tr>
            `;

            if (
                analysis.averageOdds === 'N/A' ||
                analysis.probability === 'N/A' ||
                analysis.consensus === 'N/A'
            ) {
                naRows.push(rowHtml);
            } else {
                validRows.push(rowHtml);
            }
            rowIndex++;
        });

        return validRows.join('') + naRows.join('');
    }

    filterOddsTable(filter) {
        if (!this._lastOddsTableEvents) return;
        const table = this.oddsTable.querySelector('tbody');
        if (table) {
            table.innerHTML = this.generateOddsTableRows(this._lastOddsTableEvents, filter);
        }
    }

    renderRecommendations(events) {
        this._lastRecommendationsEvents = events;
        if (!events || events.length === 0) {
            this.recommendations.innerHTML = '<div class="no-data-message">' + this.translate("No recommendations available.") + '</div>';
            return;
        }

        // Raggruppa dati per squadra
        const teamStats = {};

        events.forEach(event => {
            const analyses = analyzer.analyzeEvent(event);
            analyses.forEach(analysis => {
                const team = analysis.outcome;
                if (!teamStats[team]) {
                    teamStats[team] = {
                        count: 0,
                        avgOddsSum: 0,
                        probSum: 0,
                        consensusSum: 0,
                        minOdds: Number.POSITIVE_INFINITY,
                        maxOdds: Number.NEGATIVE_INFINITY,
                        bookmakerCountSum: 0,
                        avgProb: 0 // for color class
                    };
                }
                teamStats[team].count += 1;
                teamStats[team].avgOddsSum += parseFloat(analysis.averageOdds) || 0;
                teamStats[team].probSum += parseFloat(analysis.impliedProbability) || 0;
                teamStats[team].consensusSum += parseFloat(analysis.consensus) || 0;
                teamStats[team].minOdds = Math.min(teamStats[team].minOdds, parseFloat(analysis.minimumOdds) || teamStats[team].minOdds);
                teamStats[team].maxOdds = Math.max(teamStats[team].maxOdds, parseFloat(analysis.maximumOdds) || teamStats[team].maxOdds);
                teamStats[team].bookmakerCountSum += analysis.bookmakerCount || 0;
            });
        });

        // Barra di ricerca
        this.recommendations.innerHTML = `
            <div style="margin-bottom:1.5rem;">
                <input type="text" id="team-search" placeholder="${this.translate("Search team...")}" style="width:100%;padding:0.7rem 1rem;border-radius:2rem;border:1.5px solid var(--glass-border);background:var(--bg-secondary);color:var(--text-primary);font-size:1rem;">
            </div>
            <div id="recommendations-list"></div>
        `;

        const renderList = (filterText = '') => {
            let recommendationsHTML = '';
            Object.entries(teamStats).forEach(([team, stats]) => {
                if (filterText && !team.toLowerCase().includes(filterText.toLowerCase())) return;
                const avgOdds = stats.count ? (stats.avgOddsSum / stats.count).toFixed(2) : '-';
                const avgProb = stats.count ? (stats.probSum / stats.count).toFixed(1) : '-';
                const avgConsensus = stats.count ? (stats.consensusSum / stats.count).toFixed(1) : '-';
                const avgBookmakers = stats.count ? Math.round(stats.bookmakerCountSum / stats.count) : '-';
                const minOdds = isFinite(stats.minOdds) ? stats.minOdds.toFixed(2) : '-';
                const maxOdds = isFinite(stats.maxOdds) ? stats.maxOdds.toFixed(2) : '-';

                // Determina la classe per la barra laterale in base alla probabilità media
                let probClass = '';
                const prob = parseFloat(avgProb);
                if (!isNaN(prob)) {
                    if (prob >= 70) probClass = 'high-probability';
                    else if (prob >= 50) probClass = 'medium-probability';
                    else probClass = 'low-probability';
                }

                recommendationsHTML += `
                    <div class="recommendation-item ${probClass}">
                        <div class="recommendation-outcome">${team}</div>
                        <div class="recommendation-details">
                            <p>${this.translate("Avg. Probability:")} <strong>${avgProb}%</strong></p>
                            <p>${this.translate("Avg. Odds:")} <strong>${avgOdds}</strong></p>
                            <p>${this.translate("Min Odds:")} <strong>${minOdds}</strong> | ${this.translate("Max Odds:")} <strong>${maxOdds}</strong></p>
                            <p>${this.translate("Avg. Consensus:")} <strong>${avgConsensus}%</strong></p>
                            <p>${this.translate("Avg. Bookmakers:")} <strong>${avgBookmakers}</strong></p>
                            <p>${this.translate("Occurrences:")} <strong>${stats.count}</strong></p>
                        </div>
                    </div>
                `;
            });
            document.getElementById('recommendations-list').innerHTML = recommendationsHTML || `<div class="no-data-message">${this.translate("No teams found.")}</div>`;
        };

        renderList();

        // Event listener per la barra di ricerca
        const searchInput = document.getElementById('team-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderList(e.target.value);
            });
        }
    }

    showError(message) {
        // Implementa la visualizzazione degli errori
        alert(message);
    }

    translatePage() {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.dataset.translate;
            element.textContent = this.translate(key);
        });
    }

    updateDynamicTranslations() {
        // Aggiorna Featured Events
        if (this._lastOddsTableEvents) {
            this.renderOddsTable(this._lastOddsTableEvents);
        }
        // Aggiorna Event Cards
        if (this._lastEventCardsEvents) {
            this.renderEventCards(this._lastEventCardsEvents);
        }
        // Aggiorna Recommendations
        if (this._lastRecommendationsEvents) {
            this.renderRecommendations(this._lastRecommendationsEvents);
        }
    }

    // Modifica i metodi che popolano le sezioni per salvare i dati per updateDynamicTranslations
    renderOddsTable(events) {
        this._lastOddsTableEvents = events;

        // Trova la squadra favorita per ogni evento
        const analysesArr = events.map(event => {
            // Prendi tutte le outcomes con probabilità calcolata
            const outcomes = [];
            event.bookmakers.forEach(b => {
                if (b.markets && b.markets[0] && b.markets[0].outcomes) {
                    b.markets[0].outcomes.forEach(o => {
                        if (o && typeof o.price === 'number') {
                            outcomes.push({
                                name: o.name,
                                price: o.price
                            });
                        }
                    });
                }
            });
            // Calcola la probabilità implicita per ogni outcome
            const outcomeProbs = outcomes.map(o => ({
                name: o.name,
                prob: o.price > 0 ? (1 / o.price) * 100 : 0
            }));
            // Trova la squadra con la probabilità più alta
            let Favorite = null;
            let maxProb = -1;
            outcomeProbs.forEach(o => {
                if (o.prob > maxProb) {
                    maxProb = o.prob;
                    Favorite = o.name;
                }
            });
            return { Favorite };
        });

        this.oddsTable.innerHTML = `<table class="odds-table">
            <thead>
                <tr>
                    <th>Event</th>
                    <th>Best Odds</th>
                    <th>Probability</th>
                    <th>Consensus</th>
                </tr>
            </thead>
            <tbody>
                ${this.generateOddsTableRows(events, 'all', analysesArr)}
            </tbody>
        </table>`;
    }
    renderEventCards(events) {
        this._lastEventCardsEvents = events;
        if (!events || events.length === 0) {
            this.eventCards.innerHTML = '<div class="no-data-message">' + this.translate("Odds not available") + '</div>';
            return;
        }

        // Filtra solo eventi che hanno almeno una quota disponibile
        const availableEvents = events.filter(event =>
            Array.isArray(event.bookmakers) &&
            event.bookmakers.some(b => Array.isArray(b.markets) && b.markets.some(m => Array.isArray(m.outcomes) && m.outcomes.length > 0))
        );

        if (availableEvents.length === 0) {
            this.eventCards.innerHTML = '<div class="no-data-message">' + this.translate("Odds not available") + '</div>';
            return;
        }

        this.eventCards.innerHTML = availableEvents.map(event => {
            // Trova la squadra favorita per l'evento
            let winner = null;
            let maxProb = -1;
            const outcomes = [];
            event.bookmakers.forEach(b => {
                if (b.markets && b.markets[0] && b.markets[0].outcomes) {
                    b.markets[0].outcomes.forEach(o => {
                        if (o && typeof o.price === 'number') {
                            outcomes.push({
                                name: o.name,
                                price: o.price
                            });
                        }
                    });
                }
            });
            outcomes.forEach(o => {
                const prob = o.price > 0 ? (1 / o.price) * 100 : 0;
                if (prob > maxProb) {
                    maxProb = prob;
                    winner = o.name;
                }
            });

            // Prepara i nomi delle squadre con badge se favorita
            let homeHtml = event.home_team;
            let awayHtml = event.away_team;
            if (winner === event.home_team) {
                homeHtml = `<span><b>${event.home_team}</b><span class="Favorite-badge">${this.translate("Favorite")}</span></span>`;
                awayHtml = `<span>${event.away_team}</span>`;
            } else if (winner === event.away_team) {
                homeHtml = `<span>${event.home_team}</span>`;
                awayHtml = `<span><b>${event.away_team}</b><span class="Favorite-badge">${this.translate("Favorite")}</span></span>`;
            } else {
                homeHtml = `<span>${event.home_team}</span>`;
                awayHtml = `<span>${event.away_team}</span>`;
            }

            const analyses = analyzer.analyzeEvent(event);
            // Format time with timezone
            const eventDate = new Date(event.commence_time);
            const timeZone = 'UTC';
            const timeString = eventDate.toLocaleString('en-GB', { timeZone: 'UTC', hour12: false });
            return `
                <div class="event-card">
                    <div class="event-header">
                        <div class="event-teams">
                            <div class="team-row">${homeHtml}</div>
                            <div class="vs-row">vs</div>
                            <div class="team-row">${awayHtml}</div>
                        </div>
                        <span class="event-time">${timeString} <span style="font-size:0.95em;opacity:0.7;">(UTC)</span></span>
                    </div>
                    <div class="odds-analysis">
                        ${this.renderAnalyses(analyses)}
                    </div>
                </div>
            `;
        }).join('');
    }
    renderRecommendations(events) {
        this._lastRecommendationsEvents = events;
        if (!events || events.length === 0) {
            this.recommendations.innerHTML = '<div class="no-data-message">' + this.translate("No recommendations available.") + '</div>';
            return;
        }

        // Raggruppa dati per squadra
        const teamStats = {};

        events.forEach(event => {
            const analyses = analyzer.analyzeEvent(event);
            analyses.forEach(analysis => {
                const team = analysis.outcome;
                if (!teamStats[team]) {
                    teamStats[team] = {
                        count: 0,
                        avgOddsSum: 0,
                        probSum: 0,
                        consensusSum: 0,
                        minOdds: Number.POSITIVE_INFINITY,
                        maxOdds: Number.NEGATIVE_INFINITY,
                        bookmakerCountSum: 0,
                        avgProb: 0 // for color class
                    };
                }
                teamStats[team].count += 1;
                teamStats[team].avgOddsSum += parseFloat(analysis.averageOdds) || 0;
                teamStats[team].probSum += parseFloat(analysis.impliedProbability) || 0;
                teamStats[team].consensusSum += parseFloat(analysis.consensus) || 0;
                teamStats[team].minOdds = Math.min(teamStats[team].minOdds, parseFloat(analysis.minimumOdds) || teamStats[team].minOdds);
                teamStats[team].maxOdds = Math.max(teamStats[team].maxOdds, parseFloat(analysis.maximumOdds) || teamStats[team].maxOdds);
                teamStats[team].bookmakerCountSum += analysis.bookmakerCount || 0;
            });
        });

        // Barra di ricerca
        this.recommendations.innerHTML = `
            <div style="margin-bottom:1.5rem;">
                <input type="text" id="team-search" placeholder="${this.translate("Search team...")}" style="width:100%;padding:0.7rem 1rem;border-radius:2rem;border:1.5px solid var(--glass-border);background:var(--bg-secondary);color:var(--text-primary);font-size:1rem;">
            </div>
            <div id="recommendations-list"></div>
        `;

        const renderList = (filterText = '') => {
            let recommendationsHTML = '';
            Object.entries(teamStats).forEach(([team, stats]) => {
                if (filterText && !team.toLowerCase().includes(filterText.toLowerCase())) return;
                const avgOdds = stats.count ? (stats.avgOddsSum / stats.count).toFixed(2) : '-';
                const avgProb = stats.count ? (stats.probSum / stats.count).toFixed(1) : '-';
                const avgConsensus = stats.count ? (stats.consensusSum / stats.count).toFixed(1) : '-';
                const avgBookmakers = stats.count ? Math.round(stats.bookmakerCountSum / stats.count) : '-';
                const minOdds = isFinite(stats.minOdds) ? stats.minOdds.toFixed(2) : '-';
                const maxOdds = isFinite(stats.maxOdds) ? stats.maxOdds.toFixed(2) : '-';

                // Determina la classe per la barra laterale in base alla probabilità media
                let probClass = '';
                const prob = parseFloat(avgProb);
                if (!isNaN(prob)) {
                    if (prob >= 70) probClass = 'high-probability';
                    else if (prob >= 50) probClass = 'medium-probability';
                    else probClass = 'low-probability';
                }

                recommendationsHTML += `
                    <div class="recommendation-item ${probClass}">
                        <div class="recommendation-outcome">${team}</div>
                        <div class="recommendation-details">
                            <p>${this.translate("Avg. Probability:")} <strong>${avgProb}%</strong></p>
                            <p>${this.translate("Avg. Odds:")} <strong>${avgOdds}</strong></p>
                            <p>${this.translate("Min Odds:")} <strong>${minOdds}</strong> | ${this.translate("Max Odds:")} <strong>${maxOdds}</strong></p>
                            <p>${this.translate("Avg. Consensus:")} <strong>${avgConsensus}%</strong></p>
                            <p>${this.translate("Avg. Bookmakers:")} <strong>${avgBookmakers}</strong></p>
                            <p>${this.translate("Occurrences:")} <strong>${stats.count}</strong></p>
                        </div>
                    </div>
                `;
            });
            document.getElementById('recommendations-list').innerHTML = recommendationsHTML || `<div class="no-data-message">${this.translate("No teams found.")}</div>`;
        };

        renderList();

        // Event listener per la barra di ricerca
        const searchInput = document.getElementById('team-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderList(e.target.value);
            });
        }
    }
}
