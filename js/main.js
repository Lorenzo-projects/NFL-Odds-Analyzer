document.addEventListener('DOMContentLoaded', () => {
    const ui = new UI();

    ui.translatePage();
    
    // Aggiorna i dati ogni 5 minuti
    setInterval(() => {
        ui.loadSportData('nfl');
    }, CONFIG.REFRESH_INTERVAL);
});
