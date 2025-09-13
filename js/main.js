// Global ui variable for HTML onclick handlers
let ui;

document.addEventListener('DOMContentLoaded', () => {
    // Increase delay to ensure all dependencies are loaded, especially SmartUpdateManager
    setTimeout(() => {
        ui = new UI();
        ui.translatePage();
        
        // Wait a bit more for SmartUpdateManager to initialize before loading data
        setTimeout(() => {
            // Initial data load after SmartUpdateManager is ready
            ui.loadSportData('nfl');
        }, 1500);
        
        // Make openStatsModal globally available for HTML onclick handlers
        window.openStatsModal = (type) => {
            if (ui && ui.openStatsModal) {
                ui.openStatsModal(type);
            } else {
                console.error('UI not initialized or openStatsModal method not available');
            }
        };
        
        // Enhanced periodic updates with better performance
        let updateInterval;
        
        const scheduleUpdate = () => {
            clearInterval(updateInterval);
            updateInterval = setInterval(() => {
                // Only update if the tab is visible to save API calls
                if (!document.hidden) {
                    ui.loadSportData('nfl');
                }
            }, CONFIG.REFRESH_INTERVAL);
        };

        scheduleUpdate();

        // Pause updates when tab is hidden, resume when visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInterval(updateInterval);
            } else {
                scheduleUpdate();
            }
        });

        // Performance monitoring
        const performanceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'navigation') {
                    console.log(`Page load time: ${entry.loadEventEnd - entry.loadEventStart}ms`);
                }
            });
        });
        
        if (typeof PerformanceObserver !== 'undefined') {
            performanceObserver.observe({entryTypes: ['navigation']});
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        ui.loadSportData('nfl', true);
                        break;
                    case '1':
                        e.preventDefault();
                        document.querySelector('[data-section="dashboard"]')?.click();
                        break;
                    case '2':
                        e.preventDefault();
                        document.querySelector('[data-section="analysis"]')?.click();
                        break;
                    case '3':
                        e.preventDefault();
                        document.querySelector('[data-section="insights"]')?.click();
                        break;
                    case '4':
                        e.preventDefault();
                        document.querySelector('[data-section="trends"]')?.click();
                        break;
                    case '5':
                        e.preventDefault();
                        document.querySelector('[data-section="arbitrage"]')?.click();
                        break;
                }
            }
        });

        console.log('🏈 NFL Odds Analyzer Enhanced - Ready!');
    }, 100);
});
