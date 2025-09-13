const translations = {
    en: {
        "NFL Odds Analyzer": "NFL Odds Analyzer",
        "Featured Events": "Featured Events",
        "Odds Analysis": "Odds Analysis",
        "Insights": "Insights",
        "Market Trends": "Market Trends",
        "Arbitrage": "Arbitrage",
        "Arbitrage Opportunities": "Arbitrage Opportunities",
        "Understanding the Stats": "Understanding the Stats",
        "Probability": "Probability",
        "Average Odds": "Average Odds",
        "Consensus": "Consensus",
        "Bookmakers": "Bookmakers",
        "Active Events": "Active Events",
        "Avg Market Odds": "Avg Market Odds",
        "Value Bets": "Value Bets",
        "Refresh": "Refresh",
        "Export CSV": "Export CSV",
        "All Times": "All Times",
        "All Consensus": "All Consensus",
        "High Consensus": "High Consensus",
        "Medium Consensus": "Medium Consensus",
        "Low Consensus": "Low Consensus",
        "Sort by Time": "Sort by Time",
        "Sort by Probability": "Sort by Probability",
        "Sort by Value": "Sort by Value",
        "Market Sentiment": "Market Sentiment",
        "Best Value Bets": "Best Value Bets",
        "Consensus Analysis": "Consensus Analysis",
        "Odds Movement": "Odds Movement",
        "Volume Trend": "Volume Trend",
        "Arbitrage opportunities are calculated in real-time based on odds differences across bookmakers.": "Arbitrage opportunities are calculated in real-time based on odds differences across bookmakers.",
        "The implied probability of an outcome, based on the average odds from all bookmakers. Higher probability suggests a more likely outcome.": "The implied probability of an outcome, based on the average odds from all bookmakers. Higher probability suggests a more likely outcome.",
        "The weighted average of the odds for a particular outcome across all available bookmakers. This provides a central estimate of the odds.": "The weighted average of the odds for a particular outcome across all available bookmakers. This provides a central estimate of the odds.",
        "A measure of agreement among bookmakers, indicating how closely their odds align. Higher consensus suggests stronger agreement.": "A measure of agreement among bookmakers, indicating how closely their odds align. Higher consensus suggests stronger agreement.",
        "The number of bookmakers offering odds for a particular outcome. A higher number indicates more market interest and potentially more reliable data.": "The number of bookmakers offering odds for a particular outcome. A higher number indicates more market interest and potentially more reliable data.",
        "No odds available for NFL": "No odds available for NFL",
        "Odds not available": "Odds not available",
        "Data updated successfully": "Data updated successfully",
        "No recommendations available.": "No recommendations available.",
        "Probability:": "Probability:",
        "Avg. Probability:": "Avg. Probability:",
        "Average Odds:": "Average Odds:",
        "Avg. Odds:": "Avg. Odds:",
        "Min Odds:": "Min Odds:",
        "Max Odds:": "Max Odds:",
        "Consensus:": "Consensus:",
        "Avg. Consensus:": "Avg. Consensus:",
        "Avg. Bookmakers:": "Avg. Bookmakers:",
        "Bookmakers:": "Bookmakers:",
        "Occurrences:": "Occurrences:",
        "Loading data...": "Loading data...",
        "Today": "Today",
        "Tomorrow": "Tomorrow",
        "Weekend": "Weekend",
        "This Week": "This Week",
        "All Probabilities": "All Probabilities",
        "High (>70%)": "High (>70%)",
        "Medium (50-70%)": "Medium (50-70%)",
        "Low (<50%)": "Low (<50%)",
        "Search teams...": "Search teams...",
        "No teams found.": "No teams found.",
        "Favorite": "Favorite",
        "API Calls This Month": "API Calls This Month",
        "API Usage Details": "API Usage Details",
        "This Month": "This Month",
        "Remaining Calls": "Remaining Calls",
        "Cache Status": "Cache Status",
        "Force Refresh": "Force Refresh",
        "Clear Cache": "Clear Cache",
        "Usage History": "Usage History",
        "Data loaded from cache": "Data loaded from cache",
        "Data updated in background": "Data updated in background",
        "No data available": "No data available",
        "Next update scheduled for": "Next update scheduled for",
        "Error loading data": "Error loading data",
        "Auto Update": "Auto Update",
        "Updates paused - limit reached": "Updates paused - limit reached",
        "Data is being updated automatically": "Data is being updated automatically",
        "Cached data": "Cached data",
        "Last updated": "Last updated"
    }
};

function translateElement(element, key, lang = 'en') {
    if (translations.en && translations.en[key]) {
        element.textContent = translations.en[key];
    } else {
        element.textContent = key;
    }
}

function translate(key, lang = 'en') {
    return translations.en[key] || key;
}

// Always return English as the only supported language
function getCurrentLanguage() {
    return 'en';
}

// Set language function kept for compatibility, but always uses English
function setLanguage(lang) {
    localStorage.setItem('language', 'en');
    document.documentElement.lang = 'en';
    translatePage();
}

// Translate entire page (simplified for English-only)
function translatePage() {
    // Translate elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        translateElement(element, key);
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        element.placeholder = translations.en[key] || key;
    });
}

// Initialize translations when DOM is ready
document.addEventListener('DOMContentLoaded', translatePage);
