// Smart Update Manager - Gestisce gli aggiornamenti periodici ottimizzati
class SmartUpdateManager {
    constructor(firebaseCache, api) {
        this.firebaseCache = firebaseCache;
        this.api = api;
        this.updateTimer = null;
        this.isUpdating = false;
        this.lastUpdateTime = null;
        this.todayCallsCount = 0;
        
        this.initializeManager();
    }

    async initializeManager() {
        try {
            // Wait a bit for Firebase to initialize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Carica l'ultimo aggiornamento e conta le chiamate di oggi
            await this.loadTodayStats();
            
            // Check if we need an immediate update (no cache or cache too old)
            if (this.firebaseCache) {
                const cacheResult = await this.firebaseCache.getOddsFromCache('nfl');
                if (!cacheResult) {
                    console.log('🚀 No cached data found - triggering immediate update');
                    await this.updateData('no-cache');
                } else {
                    const cacheAge = Date.now() - new Date(cacheResult.timestamp).getTime();
                    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
                    
                    if (cacheAgeHours >= 3) {
                        console.log(`🚀 Cache is old (${cacheAgeHours.toFixed(1)} hours) - triggering immediate update`);
                        await this.updateData('cache-expired');
                    } else {
                        console.log(`✅ Cache is fresh (${cacheAgeHours.toFixed(1)} hours old) - scheduling next update`);
                    }
                }
            }
            
            // Avvia il sistema di aggiornamento intelligente
            this.scheduleNextUpdate();
            
            // Monitor per aggiornamenti quando la tab diventa visibile
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.handleTabVisible();
                }
            });
            
            console.log('🔄 Initializing automatic API update system (every 3 hours)');
            console.log('✅ Auto-update system initialized successfully');
        } catch (error) {
            console.error('Error initializing Smart Update Manager:', error);
            // Try to initialize with localStorage only
            this.todayCallsCount = 0;
            this.lastUpdateTime = null;
            this.scheduleNextUpdate();
        }
    }

    // Carica le statistiche di oggi
    async loadTodayStats() {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Try to get from Firebase using the api_usage collection which has permissions
            if (this.firebaseCache && this.firebaseCache.db) {
                const todayDoc = await this.firebaseCache.db.collection('api_usage').doc(`daily_${today}`).get();
                
                if (todayDoc.exists) {
                    const data = todayDoc.data();
                    this.todayCallsCount = data.calls || 0;
                    this.lastUpdateTime = data.lastUpdate ? new Date(data.lastUpdate) : null;
                    return;
                }
            }
        } catch (error) {
            console.warn('Could not load today stats from Firebase:', error);
        }

        // Fallback to localStorage if Firebase fails
        try {
            const today = new Date().toISOString().split('T')[0];
            const localStats = localStorage.getItem(`daily_stats_${today}`);
            if (localStats) {
                const data = JSON.parse(localStats);
                this.todayCallsCount = data.calls || 0;
                this.lastUpdateTime = data.lastUpdate ? new Date(data.lastUpdate) : null;
            } else {
                this.todayCallsCount = 0;
                this.lastUpdateTime = null;
            }
        } catch (error) {
            console.warn('Could not load today stats from localStorage:', error);
            this.todayCallsCount = 0;
            this.lastUpdateTime = null;
        }
    }

    // Salva le statistiche di oggi
    async saveTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const statsData = {
            calls: this.todayCallsCount,
            lastUpdate: new Date().toISOString(),
            date: today
        };

        // Try to save to Firebase using api_usage collection which has permissions
        try {
            if (this.firebaseCache && this.firebaseCache.db) {
                await this.firebaseCache.db.collection('api_usage').doc(`daily_${today}`).set(statsData);
            }
        } catch (error) {
            console.warn('Could not save to Firebase, using localStorage fallback:', error);
        }

        // Always save to localStorage as fallback
        try {
            localStorage.setItem(`daily_stats_${today}`, JSON.stringify(statsData));
        } catch (error) {
            console.error('Error saving stats to localStorage:', error);
        }
    }

    // Determina se è ora di aggiornare (semplificato per aggiornamento ogni 3 ore)
    shouldUpdateNow() {
        const now = new Date();
        
        // Controlla se abbiamo raggiunto il limite mensile
        if (this.todayCallsCount >= CONFIG.API_DISTRIBUTION.CALLS_PER_DAY) {
            console.log('Daily API limit reached, skipping update');
            return false;
        }

        // Se non abbiamo mai aggiornato, aggiorna subito
        if (!this.lastUpdateTime) {
            console.log('No previous update found, updating now');
            return true;
        }

        const hoursSinceLastUpdate = (now - this.lastUpdateTime) / (1000 * 60 * 60);
        console.log(`📊 Auto-update check: ${hoursSinceLastUpdate.toFixed(1)} hours since last update`);
        
        // Aggiorna solo se sono passate almeno 3 ore
        if (hoursSinceLastUpdate >= 3) {
            console.log(`⏰ ${hoursSinceLastUpdate.toFixed(1)} hours since last update. Time to update.`);
            return true;
        } else {
            const hoursRemaining = 3 - hoursSinceLastUpdate;
            console.log(`⏳ Next auto-update in ${hoursRemaining.toFixed(1)} hours`);
            return false;
        }
    }

    // Calcola il prossimo orario di aggiornamento (ogni 3 ore precise)
    getNextUpdateTime() {
        const now = new Date();
        
        // Se abbiamo un ultimo aggiornamento, calcola il prossimo basato su quello
        if (this.lastUpdateTime) {
            const nextUpdate = new Date(this.lastUpdateTime.getTime() + CONFIG.AUTO_UPDATE_INTERVAL);
            // Se il prossimo aggiornamento è nel futuro, usalo
            if (nextUpdate.getTime() > now.getTime()) {
                return nextUpdate.getTime();
            }
        }
        
        // Altrimenti, trova il prossimo slot di 3 ore
        const currentHour = now.getHours();
        const updateHours = CONFIG.SMART_UPDATE_HOURS; // [0, 3, 6, 9, 12, 15, 18, 21]
        
        let nextHour = null;
        for (const hour of updateHours) {
            if (hour > currentHour) {
                nextHour = hour;
                break;
            }
        }
        
        // Se non c'è nessun slot oggi, prendi il primo slot di domani (00:00)
        if (nextHour === null) {
            nextHour = 0;
            now.setDate(now.getDate() + 1);
        }
        
        now.setHours(nextHour, 0, 0, 0);
        return now.getTime();
    }

    // Programma il prossimo aggiornamento
    scheduleNextUpdate() {
        clearTimeout(this.updateTimer);
        
        const nextUpdateTime = this.getNextUpdateTime();
        const delay = nextUpdateTime - Date.now();
        
        console.log(`Next update scheduled for: ${new Date(nextUpdateTime).toLocaleString()}`);
        
        this.updateTimer = setTimeout(() => {
            this.performScheduledUpdate();
        }, delay);
    }

    // Esegui aggiornamento programmato
    async performScheduledUpdate() {
        console.log('🔔 Scheduled update triggered');
        
        if (this.shouldUpdateNow()) {
            console.log('✅ Update conditions met, performing update...');
            await this.updateData('scheduled');
        } else {
            console.log('⏭️ Update conditions not met, skipping...');
        }
        
        // Programma il prossimo aggiornamento
        this.scheduleNextUpdate();
    }

    // Gestisce quando la tab diventa visibile (solo controlla cache, no aggiornamenti manuali)
    async handleTabVisible() {
        console.log('Tab became visible - checking cache status');
        // Non fare aggiornamenti manuali, solo loggare lo stato
        if (this.firebaseCache) {
            try {
                const cacheResult = await this.firebaseCache.getOddsFromCache('nfl');
                if (cacheResult) {
                    const cacheAge = Date.now() - new Date(cacheResult.timestamp).getTime();
                    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
                    console.log(`Cache available (${cacheAgeHours.toFixed(1)} hours old)`);
                } else {
                    console.log('No cache available - waiting for next automatic update');
                }
            } catch (error) {
                console.warn('Error checking cache status:', error);
            }
        }
    }

    // Metodo principale per aggiornare i dati
    async updateData(reason = 'unknown') {
        if (this.isUpdating) {
            console.log('Update already in progress, skipping');
            return null;
        }

        this.isUpdating = true;
        console.log(`🔄 Starting data update (reason: ${reason})`);

        try {
            // Controlla se possiamo fare una chiamata API
            if (this.firebaseCache) {
                const monthlyUsage = await this.firebaseCache.getCurrentUsage();
                if (monthlyUsage.count >= monthlyUsage.limit) {
                    console.log('❌ Monthly API limit reached, cannot update');
                    return null;
                }
            }

            // Controlla se abbiamo già fatto troppe chiamate oggi
            if (this.todayCallsCount >= CONFIG.API_DISTRIBUTION.CALLS_PER_DAY) {
                console.log('❌ Daily limit reached, cannot update');
                return null;
            }

            // Verifica se c'è già della cache recente, MA solo se non è un forced update
            if (this.firebaseCache && reason !== 'force' && reason !== 'no-cache') {
                const cacheResult = await this.firebaseCache.getOddsFromCache('nfl');
                if (cacheResult) {
                    const cacheAge = Date.now() - new Date(cacheResult.timestamp).getTime();
                    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
                    
                    // Se la cache è più vecchia di 3 ore, aggiorna
                    if (cacheAgeHours < 3) {
                        console.log(`✅ Cache is recent (${cacheAgeHours.toFixed(1)} hours old), skipping update`);
                        return cacheResult.data;
                    }
                    console.log(`⏰ Cache is old (${cacheAgeHours.toFixed(1)} hours), updating...`);
                }
            }

            // Esegui l'aggiornamento effettivo
            console.log('🌐 Making API call to fetch fresh data...');
            const newData = await this.api.fetchOddsDirectly('nfl');
            
            if (newData) {
                // Aggiorna le statistiche
                this.todayCallsCount++;
                this.lastUpdateTime = new Date();
                await this.saveTodayStats();
                
                console.log(`✅ Data updated successfully (reason: ${reason}). Calls today: ${this.todayCallsCount}`);
                return newData;
            } else {
                console.log('❌ API call failed, no new data received');
            }

        } catch (error) {
            console.error('❌ Error during data update:', error);
        } finally {
            this.isUpdating = false;
        }

        return null;
    }

    // Forza un aggiornamento (se possibile)
    async forceUpdate() {
        console.log('🚀 Force update requested');
        return await this.updateData('force');
    }

    // Test immediato del sistema di aggiornamento
    async testUpdateSystem() {
        console.log('🧪 Testing update system...');
        
        // Simula una cache scaduta
        const oldTime = this.lastUpdateTime;
        this.lastUpdateTime = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 ore fa
        
        const result = await this.updateData('test');
        
        // Ripristina il tempo originale se l'update non è andato a buon fine
        if (!result) {
            this.lastUpdateTime = oldTime;
        }
        
        return result;
    }

    // Ottieni statistiche di utilizzo
    getUsageStats() {
        return {
            todayCallsCount: this.todayCallsCount,
            lastUpdateTime: this.lastUpdateTime,
            isUpdating: this.isUpdating,
            nextUpdateTime: this.getNextUpdateTime()
        };
    }

    // Debug del sistema di aggiornamento
    debugStatus() {
        const now = new Date();
        const nextUpdate = new Date(this.getNextUpdateTime());
        const hoursSinceLastUpdate = this.lastUpdateTime ? 
            (now - this.lastUpdateTime) / (1000 * 60 * 60) : 'Never';
        
        console.log('📊 SmartUpdateManager Debug Status:');
        console.log(`  🕐 Current time: ${now.toLocaleString()}`);
        console.log(`  🕘 Last update: ${this.lastUpdateTime ? this.lastUpdateTime.toLocaleString() : 'Never'}`);
        console.log(`  ⏱️ Hours since last update: ${typeof hoursSinceLastUpdate === 'number' ? hoursSinceLastUpdate.toFixed(1) : hoursSinceLastUpdate}`);
        console.log(`  🔮 Next update: ${nextUpdate.toLocaleString()}`);
        console.log(`  📞 Today calls: ${this.todayCallsCount}/${CONFIG.API_DISTRIBUTION.CALLS_PER_DAY}`);
        console.log(`  🔄 Is updating: ${this.isUpdating}`);
        console.log(`  ✅ Should update now: ${this.shouldUpdateNow()}`);
        
        return this.getUsageStats();
    }
}

// Esporta per l'uso globale
window.SmartUpdateManager = SmartUpdateManager;

// Debug commands for testing
window.debugSmartUpdate = function() {
    if (window.smartUpdateManager) {
        return window.smartUpdateManager.debugStatus();
    } else {
        console.log('❌ SmartUpdateManager not initialized');
        return null;
    }
};

window.forceUpdateNow = async function() {
    if (window.smartUpdateManager) {
        console.log('🚀 Forcing immediate update...');
        const result = await window.smartUpdateManager.forceUpdate();
        if (result) {
            console.log('✅ Force update successful');
            // Reload the UI if needed
            if (window.ui) {
                window.ui.loadSportData('nfl');
            }
        } else {
            console.log('❌ Force update failed');
        }
        return result;
    } else {
        console.log('❌ SmartUpdateManager not initialized');
        return null;
    }
};

window.testUpdateSystem = async function() {
    if (window.smartUpdateManager) {
        return await window.smartUpdateManager.testUpdateSystem();
    } else {
        console.log('❌ SmartUpdateManager not initialized');
        return null;
    }
};
