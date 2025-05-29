class OddsAnalyzer {
    analyzeEvent(event) {
        const bookmakerOdds = event.bookmakers.map(b => b.markets[0]?.outcomes || []);
        const allOutcomes = this.aggregateOutcomes(bookmakerOdds);
        
        return Object.entries(allOutcomes).map(([outcome, odds]) => {
            const analysis = this.analyzeOutcome(odds);
            return {
                outcome,
                ...analysis,
                bookmakerCount: odds.length,
                consensus: this.calculateConsensus(odds)
            };
        }).sort((a, b) => b.impliedProbability - a.impliedProbability);
    }

    aggregateOutcomes(bookmakerOdds) {
        const outcomes = {};
        bookmakerOdds.flat().forEach(outcome => {
            if (!outcome) return;
            if (!outcomes[outcome.name]) {
                outcomes[outcome.name] = [];
            }
            outcomes[outcome.name].push(outcome.price);
        });
        return outcomes;
    }

    analyzeOutcome(odds) {
        const validOdds = odds.filter(o => typeof o === 'number' && o > 0);
        if (!validOdds.length) {
            return {
                averageOdds: 'N/A',
                impliedProbability: 'N/A',
                minimumOdds: 'N/A',
                maximumOdds: 'N/A',
                oddsVariance: 'N/A'
            };
        }
        const avg = this.calculateWeightedAverage(validOdds);
        const impliedProbability = (1 / avg) * 100;

        return {
            averageOdds: avg.toFixed(2),
            impliedProbability: impliedProbability.toFixed(1),
            minimumOdds: Math.min(...validOdds).toFixed(2),
            maximumOdds: Math.max(...validOdds).toFixed(2),
            oddsVariance: this.calculateVariance(validOdds).toFixed(2)
        };
    }

    calculateWeightedAverage(odds) {
        if (!odds.length) return 0;
        const sum = odds.reduce((acc, odd) => acc + odd, 0);
        return sum / odds.length;
    }

    calculateVariance(odds) {
        if (!odds.length) return 0;
        const mean = odds.reduce((a, b) => a + b, 0) / odds.length;
        return Math.sqrt(odds.reduce((sum, odd) => sum + Math.pow(odd - mean, 2), 0) / odds.length);
    }

    calculateConsensus(odds) {
        const validOdds = odds.filter(o => typeof o === 'number' && o > 0);
        if (!validOdds.length) return 0;
        const avg = this.calculateWeightedAverage(validOdds);
        const variance = validOdds.reduce((acc, odd) =>
            acc + Math.pow(odd - avg, 2), 0) / validOdds.length;
        return Math.max(0, 100 * (1 - Math.sqrt(variance) / avg));
    }

    getConfidenceLevel(consensus, sampleSize) {
        if (consensus >= CONFIG.CONSENSUS_THRESHOLDS.HIGH && sampleSize >= 10) return 'HIGH';
        if (consensus >= CONFIG.CONSENSUS_THRESHOLDS.MEDIUM && sampleSize >= 5) return 'MEDIUM';
        return 'LOW';
    }

    analyzeOdds(odds) {
        const validOdds = Array.isArray(odds) ? odds.filter(odd => typeof odd === 'number' && odd > 0) : [];
        if (!validOdds.length) {
            return {
                averageOdds: 'N/A',
                probability: 'N/A',
                consensus: 'N/A'
            };
        }
        const avg = this.calculateWeightedAverage(validOdds);
        const impliedProbability = (1 / avg) * 100;

        return {
            averageOdds: avg.toFixed(2),
            probability: impliedProbability.toFixed(1),
            consensus: this.calculateConsensus(validOdds).toFixed(1)
        };
    }

    generateRecommendation(probability, consensus) {
        if (probability > 70 && consensus > 80) return 'STRONG BET';
        if (probability > 50 && consensus > 60) return 'CONSIDER';
        return 'AVOID';
    }
}

const analyzer = new OddsAnalyzer();
