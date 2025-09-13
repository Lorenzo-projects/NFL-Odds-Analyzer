// Firebase configuration and initialization
// Using Firebase v8 SDK

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5qPzWSsTA1zk78dd1_mHo-PxrvwncTSA",
    authDomain: "game-analizer.firebaseapp.com",
    projectId: "game-analizer",
    storageBucket: "game-analizer.firebasestorage.app",
    messagingSenderId: "1004420836965",
    appId: "1:1004420836965:web:863b378bd648dadfaca08c",
    measurementId: "G-ESK0QN4XF4"
};

class FirebaseCache {
    constructor() {
        this.app = null;
        this.db = null;
        this.MONTHLY_LIMIT = 450;
        this.CACHE_COLLECTION = 'odds_cache';
        this.USAGE_COLLECTION = 'api_usage';
        this.initialized = false;
        
        this.initializeFirebase();
    }

    async initializeFirebase() {
        try {
            // Wait for Firebase to be available
            if (typeof firebase === 'undefined') {
                console.log('Waiting for Firebase to load...');
                await new Promise(resolve => {
                    const checkFirebase = () => {
                        if (typeof firebase !== 'undefined') {
                            resolve();
                        } else {
                            setTimeout(checkFirebase, 100);
                        }
                    };
                    checkFirebase();
                });
            }

            // Initialize Firebase using v8 standard syntax
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                this.app = firebase.app(); // Use existing app
            }
            
            this.db = firebase.firestore();
            this.initialized = true;
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.initialized = false;
        }
    }

    // Wait for initialization
    async waitForInit() {
        if (this.initialized) return true;
        
        return new Promise((resolve) => {
            const checkInit = () => {
                if (this.initialized) {
                    resolve(true);
                } else {
                    setTimeout(checkInit, 100);
                }
            };
            checkInit();
        });
    }

    // Get current month key (YYYY-MM format)
    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Check if we can make an API call this month
    async canMakeApiCall() {
        try {
            await this.waitForInit();
            if (!this.initialized) return false;

            const monthKey = this.getCurrentMonthKey();
            const usageDoc = this.db.collection(this.USAGE_COLLECTION).doc(monthKey);
            const usageSnapshot = await usageDoc.get();
            
            if (!usageSnapshot.exists) {
                return true; // First call of the month
            }
            
            const usage = usageSnapshot.data();
            return usage.count < this.MONTHLY_LIMIT;
        } catch (error) {
            console.error('Error checking API usage:', error);
            return false; // Be conservative - don't allow call if we can't check
        }
    }

    // Increment API usage counter
    async incrementApiUsage() {
        try {
            await this.waitForInit();
            if (!this.initialized) throw new Error('Firebase not initialized');
            
            const monthKey = this.getCurrentMonthKey();
            const usageDoc = this.db.collection(this.USAGE_COLLECTION).doc(monthKey);
            const usageSnapshot = await usageDoc.get();
            
            let newCount = 1;
            if (usageSnapshot.exists) {
                newCount = usageSnapshot.data().count + 1;
            }
            
            await usageDoc.set({
                count: newCount,
                month: monthKey,
                lastUpdated: new Date().toISOString(),
                lastApiCall: Date.now()
            });
            
            // Also save to localStorage for immediate access
            localStorage.setItem('last_api_call', Date.now().toString());
            
            console.log(`API usage this month (${monthKey}): ${newCount}/${this.MONTHLY_LIMIT}`);
            return newCount;
        } catch (error) {
            console.error('Error incrementing API usage:', error);
            throw error;
        }
    }

    // Get current API usage for the month
    async getCurrentUsage() {
        try {
            await this.waitForInit();
            if (!this.initialized) return { count: 0, limit: this.MONTHLY_LIMIT, remaining: this.MONTHLY_LIMIT };

            const monthKey = this.getCurrentMonthKey();
            const usageDoc = this.db.collection(this.USAGE_COLLECTION).doc(monthKey);
            const usageSnapshot = await usageDoc.get();
            
            if (!usageSnapshot.exists) {
                return { count: 0, limit: this.MONTHLY_LIMIT, remaining: this.MONTHLY_LIMIT };
            }
            
            const usage = usageSnapshot.data();
            return { 
                count: usage.count || 0, 
                limit: this.MONTHLY_LIMIT,
                remaining: this.MONTHLY_LIMIT - (usage.count || 0),
                lastApiCall: usage.lastApiCall,
                lastUpdated: usage.lastUpdated
            };
        } catch (error) {
            console.error('Error getting current usage:', error);
            return { count: 0, limit: this.MONTHLY_LIMIT, remaining: this.MONTHLY_LIMIT };
        }
    }

    // Generate cache key for sport data
    generateCacheKey(sport) {
        return `odds_${sport}`;
    }

    // Save odds data to cache
    async saveOddsToCache(sport, oddsData) {
        try {
            await this.waitForInit();
            if (!this.initialized) throw new Error('Firebase not initialized');
            
            const cacheKey = this.generateCacheKey(sport);
            const cacheDoc = this.db.collection(this.CACHE_COLLECTION).doc(cacheKey);
            
            await cacheDoc.set({
                sport: sport,
                data: oddsData,
                timestamp: new Date().toISOString(),
                lastUpdated: Date.now()
            });
            
            console.log(`Odds data cached for sport: ${sport}`);
        } catch (error) {
            console.error('Error saving to cache:', error);
            throw error;
        }
    }

    // Get odds data from cache
    async getOddsFromCache(sport) {
        try {
            await this.waitForInit();
            if (!this.initialized) return null;
            
            const cacheKey = this.generateCacheKey(sport);
            const cacheDoc = this.db.collection(this.CACHE_COLLECTION).doc(cacheKey);
            const cacheSnapshot = await cacheDoc.get();
            
            if (!cacheSnapshot.exists) {
                console.log(`No cached data found for sport: ${sport}`);
                return null;
            }
            
            const cachedData = cacheSnapshot.data();
            console.log(`Using cached data for sport: ${sport} (cached at: ${cachedData.timestamp})`);
            
            // Return the full cache object with data and metadata
            return {
                data: cachedData.data,
                timestamp: cachedData.timestamp,
                lastUpdated: cachedData.lastUpdated,
                sport: cachedData.sport
            };
        } catch (error) {
            console.error('Error retrieving from cache:', error);
            return null;
        }
    }

    // Check if cached data exists and is fresh enough (optional - since we always use cache until new API call)
    async isCacheValid(sport, maxAgeMinutes = 60) {
        try {
            await this.waitForInit();
            if (!this.initialized) return false;
            
            const cacheKey = this.generateCacheKey(sport);
            const cacheDoc = this.db.collection(this.CACHE_COLLECTION).doc(cacheKey);
            const cacheSnapshot = await cacheDoc.get();
            
            if (!cacheSnapshot.exists) {
                return false;
            }
            
            const cachedData = cacheSnapshot.data();
            const cacheAge = Date.now() - cachedData.lastUpdated;
            const maxAgeMs = maxAgeMinutes * 60 * 1000;
            
            return cacheAge < maxAgeMs;
        } catch (error) {
            console.error('Error checking cache validity:', error);
            return false;
        }
    }

    // Get usage statistics for monitoring
    async getUsageStats() {
        try {
            await this.waitForInit();
            if (!this.initialized) return [];

            const usageQuery = this.db.collection(this.USAGE_COLLECTION)
                .orderBy('month', 'desc')
                .limit(12); // Last 12 months
            
            const usageSnapshot = await usageQuery.get();
            
            const stats = [];
            usageSnapshot.forEach(doc => {
                stats.push({
                    month: doc.id,
                    ...doc.data()
                });
            });
            
            return stats;
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return [];
        }
    }
}

// Export the FirebaseCache class
window.FirebaseCache = FirebaseCache;
