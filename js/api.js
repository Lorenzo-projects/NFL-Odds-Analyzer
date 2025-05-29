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
    }

    async fetchOdds(sport) {
        const sportKey = this.getSportKey(sport);
        if (!sportKey) {
            console.error('Invalid sport key:', sport);
            return null;
        }

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
}

const api = new OddsAPI();
