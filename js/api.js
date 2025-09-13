class OddsAPI {
    constructor() {
        this.cache = new Map();
        // Array di proxy CORS da provare in ordine
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://proxy.cors.sh/'
        ];
        this.currentProxyIndex = 0;
        this.baseUrl = 'https://api.the-odds-api.com/v4';
        this.maxRetries = 3;
        
        // Initialize Firebase cache
        this.firebaseCache = new FirebaseCache();
        this.isFirebaseInitialized = false;
        this.smartUpdateManager = null;
        // Make firebaseCache globally accessible
        window.firebaseCache = this.firebaseCache;
        this.initFirebase();
    }

    async initFirebase() {
        try {
            // Test Firebase connection
            await this.firebaseCache.getCurrentUsage();
            this.isFirebaseInitialized = true;
            console.log('Firebase cache initialized successfully');
            
            // Initialize Smart Update Manager
            if (typeof SmartUpdateManager !== 'undefined') {
                this.smartUpdateManager = new SmartUpdateManager(this.firebaseCache, this);
                // Make it globally accessible
                window.smartUpdateManager = this.smartUpdateManager;
                console.log('Smart Update Manager initialized');
            }
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.isFirebaseInitialized = false;
        }
    }

    async fetchOdds(sport) {
        const sportKey = this.getSportKey(sport);
        if (!sportKey) {
            console.error('Invalid sport key:', sport);
            return null;
        }

        // SEMPRE prova a prendere i dati dalla cache Firebase prima di tutto
        if (this.isFirebaseInitialized) {
            try {
                const cacheResult = await this.firebaseCache.getOddsFromCache(sport);
                if (cacheResult) {
                    const cacheAge = Date.now() - new Date(cacheResult.timestamp).getTime();
                    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
                    console.log(`Using cached data from Firebase (${cacheAgeHours.toFixed(1)} hours old)`);
                    return cacheResult.data;
                }
            } catch (error) {
                console.warn('Error retrieving from Firebase cache:', error);
            }
        }

        // Se non c'è cache, NON fare chiamate manuali - i dati verranno aggiornati automaticamente
        console.log('No cached data available. Waiting for automatic update every 3 hours...');
        console.log('Data will be automatically updated by the Smart Update Manager');
        
        // Ritorna null - l'interfaccia mostrerà il messaggio di attesa
        return null;
        
        for (let proxyIndex = 0; proxyIndex < this.corsProxies.length; proxyIndex++) {
            let retries = 0;
            while (retries <= this.maxRetries) {
                try {
                    const url = `${this.baseUrl}/sports/${sportKey}/odds`;
                    const params = new URLSearchParams({
                        apiKey: CONFIG.API_KEY,
                        regions: 'eu',
                        markets: 'h2h',
                        oddsFormat: 'decimal'
                    });

                    const fullUrl = `${url}?${params}`;
                    const encodedUrl = encodeURIComponent(fullUrl);
                    const proxyUrl = `${this.corsProxies[proxyIndex]}${encodedUrl}`;

                    console.log(`Trying proxy ${proxyIndex + 1}/${this.corsProxies.length}, attempt ${retries + 1}/${this.maxRetries + 1}`);
                    
                    const response = await fetch(proxyUrl, {
                        headers: {
                            'Accept': 'application/json',
                            'x-requested-with': 'XMLHttpRequest'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (data && !data.error) {
                        console.log('Successfully fetched data');
                        
                        // Increment API usage counter and save to Firebase cache
                        if (this.isFirebaseInitialized) {
                            try {
                                await this.firebaseCache.incrementApiUsage();
                                await this.firebaseCache.saveOddsToCache(sport, data);
                                console.log('Data cached to Firebase');
                            } catch (error) {
                                console.error('Error saving to Firebase cache:', error);
                                // Continue anyway with the fresh data
                            }
                        }
                        
                        return data;
                    }

                    throw new Error('Invalid data format received');

                } catch (error) {
                    console.error(`Proxy ${proxyIndex + 1}, Attempt ${retries + 1} failed:`, error);
                    retries++;

                    if (retries > this.maxRetries) {
                        console.error(`All retry attempts failed for proxy ${proxyIndex + 1}`);
                        break; // Try next proxy
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }
        }

        throw new Error('All proxies failed to fetch data');
    }

    getSportKey(sport) {
        return 'americanfootball_nfl';
    }

    // Get current API usage statistics
    async getApiUsage() {
        if (!this.isFirebaseInitialized) {
            return { error: 'Firebase not initialized' };
        }
        
        try {
            return await this.firebaseCache.getCurrentUsage();
        } catch (error) {
            console.error('Error getting API usage:', error);
            return { error: 'Failed to get usage statistics' };
        }
    }

    // Get usage history
    async getUsageHistory() {
        if (!this.isFirebaseInitialized) {
            return { error: 'Firebase not initialized' };
        }
        
        try {
            return await this.firebaseCache.getUsageStats();
        } catch (error) {
            console.error('Error getting usage history:', error);
            return { error: 'Failed to get usage history' };
        }
    }

    // Force refresh data (will make API call if within limits)
    async forceRefresh(sport) {
        if (!this.isFirebaseInitialized) {
            return await this.fetchOddsDirectly(sport);
        }

        // Use Smart Update Manager if available
        if (this.smartUpdateManager) {
            try {
                return await this.smartUpdateManager.forceUpdate();
            } catch (error) {
                console.error('Error during smart force refresh:', error);
                throw error;
            }
        }

        // Fallback to direct method
        try {
            const canMakeCall = await this.firebaseCache.canMakeApiCall();
            if (!canMakeCall) {
                const usage = await this.firebaseCache.getCurrentUsage();
                throw new Error(`Monthly API limit reached (${usage.count}/${usage.limit}). Cannot force refresh.`);
            }
            
            return await this.fetchOddsDirectly(sport);
        } catch (error) {
            console.error('Error during force refresh:', error);
            throw error;
        }
    }

    // Direct API call (bypassing cache check, but still saving to cache)
    async fetchOddsDirectly(sport) {
        const sportKey = this.getSportKey(sport);
        if (!sportKey) {
            console.error('Invalid sport key:', sport);
            return null;
        }

        console.log('Making direct API call...');
        
        for (let proxyIndex = 0; proxyIndex < this.corsProxies.length; proxyIndex++) {
            let retries = 0;
            while (retries <= this.maxRetries) {
                try {
                    const url = `${this.baseUrl}/sports/${sportKey}/odds`;
                    const params = new URLSearchParams({
                        apiKey: CONFIG.API_KEY,
                        regions: 'eu',
                        markets: 'h2h',
                        oddsFormat: 'decimal'
                    });

                    const fullUrl = `${url}?${params}`;
                    const encodedUrl = encodeURIComponent(fullUrl);
                    const proxyUrl = `${this.corsProxies[proxyIndex]}${encodedUrl}`;

                    console.log(`Direct call - Proxy ${proxyIndex + 1}/${this.corsProxies.length}, attempt ${retries + 1}/${this.maxRetries + 1}`);
                    
                    const response = await fetch(proxyUrl, {
                        headers: {
                            'Accept': 'application/json',
                            'x-requested-with': 'XMLHttpRequest'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (data && !data.error) {
                        console.log('Direct call successful');
                        
                        // Increment API usage counter and save to Firebase cache
                        if (this.isFirebaseInitialized) {
                            try {
                                await this.firebaseCache.incrementApiUsage();
                                await this.firebaseCache.saveOddsToCache(sport, data);
                                console.log('Data cached to Firebase');
                            } catch (error) {
                                console.error('Error saving to Firebase cache:', error);
                                // Continue anyway with the fresh data
                            }
                        }
                        
                        return data;
                    }

                    throw new Error('Invalid data format received');

                } catch (error) {
                    console.error(`Direct call - Proxy ${proxyIndex + 1}, Attempt ${retries + 1} failed:`, error);
                    retries++;

                    if (retries > this.maxRetries) {
                        console.error(`All retry attempts failed for proxy ${proxyIndex + 1}`);
                        break; // Try next proxy
                    }

                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }
        }

        throw new Error('All proxies failed to fetch data');
    }

    // Get Smart Update Manager stats
    getUpdateStats() {
        if (this.smartUpdateManager) {
            return this.smartUpdateManager.getStats();
        }
        return null;
    }

    // Check if we have valid cached data
    async hasValidCache(sport) {
        if (this.smartUpdateManager) {
            return await this.smartUpdateManager.hasValidCache(sport);
        }
        return false;
    }
}

const api = new OddsAPI();
