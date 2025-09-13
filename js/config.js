const CONFIG = {
    API_KEY: '4e04d3eb18c906728ea958cbd98a3ca6',
    BASE_URL: 'https://api.the-odds-api.com/v4',
    SPORTS: {
        NFL: 'americanfootball_nfl'
    },
    
    // Cache and API management
    MONTHLY_API_LIMIT: 450,
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 ore in millisecondi
    AUTO_UPDATE_INTERVAL: 3 * 60 * 60 * 1000, // Aggiornamento automatico ogni 3 ore
    MIN_UPDATE_INTERVAL: 3 * 60 * 60 * 1000, // Minimo 3 ore tra gli aggiornamenti
    SMART_UPDATE_HOURS: [0, 3, 6, 9, 12, 15, 18, 21], // Aggiornamento ogni 3 ore
    
    // Distribuzione chiamate API nel mese (semplificata)
    API_DISTRIBUTION: {
        CALLS_PER_DAY: 8, // 8 chiamate al giorno (ogni 3 ore = 24/3 = 8)
        EXPECTED_MONTHLY_CALLS: 240, // 8 * 30 giorni = 240 chiamate al mese
        MAX_MONTHLY_CALLS: 450, // Limite massimo disponibile
        AUTO_UPDATE_ONLY: true // Solo aggiornamenti automatici, no manuali
    },
    
    REFRESH_INTERVAL: 300000, // 5 minutes per aggiornare UI
    CONSENSUS_THRESHOLDS: {
        HIGH: 80,
        MEDIUM: 60,
        LOW: 0
    },
    VALUE_BET_THRESHOLDS: {
        MIN_PROBABILITY: 60,
        MIN_CONSENSUS: 70,
        MIN_VALUE_RATING: 65
    },
    ARBITRAGE_SETTINGS: {
        MIN_PROFIT: 0.5, // Minimum profit percentage
        MIN_BOOKMAKERS: 2
    },
    UI_SETTINGS: {
        ANIMATION_DURATION: 250,
        DEBOUNCE_DELAY: 300,
        MAX_DISPLAY_EVENTS: 50
    },
    PERFORMANCE: {
        ENABLE_CACHING: true,
        LAZY_LOADING: true,
        DEBOUNCED_SEARCH: true
    }
};
