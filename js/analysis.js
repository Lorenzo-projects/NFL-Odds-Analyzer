class OddsAnalyzer {
    constructor() {
        this.historicalData = []; // For trend analysis
        this.marketSentiment = null;
    }

    analyzeEvent(event) {
        const bookmakerOdds = event.bookmakers.map(b => b.markets[0]?.outcomes || []);
        const allOutcomes = this.aggregateOutcomes(bookmakerOdds);
        
        return Object.entries(allOutcomes).map(([outcome, odds]) => {
            const analysis = this.analyzeOutcome(odds);
            return {
                outcome,
                ...analysis,
                bookmakerCount: odds.length,
                consensus: this.calculateConsensus(odds),
                valueRating: this.calculateValueRating(analysis.impliedProbability, analysis.averageOdds, this.calculateConsensus(odds))
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
        // Weight by bookmaker reliability (simplified - all equal for now)
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

    calculateValueRating(probability, odds, consensus) {
        const probValue = parseFloat(probability) || 0;
        const oddsValue = parseFloat(odds) || 0;
        const consensusValue = parseFloat(consensus) || 0;
        
        // Enhanced value calculation considering probability, odds attractiveness, and consensus
        const valueScore = (probValue * 0.4) + ((1/oddsValue) * 100 * 0.3) + (consensusValue * 0.3);
        return Math.min(100, Math.max(0, valueScore));
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

    generateRecommendation(probability, consensus, valueRating) {
        const prob = parseFloat(probability) || 0;
        const cons = parseFloat(consensus) || 0;
        const value = parseFloat(valueRating) || 0;
        
        if (prob > 70 && cons > 80 && value > 75) return 'STRONG BET';
        if (prob > 60 && cons > 70 && value > 65) return 'GOOD VALUE';
        if (prob > 50 && cons > 60 && value > 55) return 'CONSIDER';
        if (prob > 40 && cons > 50) return 'MONITOR';
        return 'AVOID';
    }

    // Enhanced analytics methods
    calculateMarketSentiment(events) {
        if (!events || events.length === 0) return null;
        
        let totalBookmakers = 0;
        let highConsensusCount = 0;
        let totalVariance = 0;
        
        events.forEach(event => {
            const analyses = this.analyzeEvent(event);
            analyses.forEach(analysis => {
                totalBookmakers += analysis.bookmakerCount;
                if (parseFloat(analysis.consensus) > 70) {
                    highConsensusCount++;
                }
                totalVariance += parseFloat(analysis.oddsVariance) || 0;
            });
        });
        
        const avgBookmakers = totalBookmakers / (events.length * 2); // Assuming 2 outcomes per event
        const consensusRatio = highConsensusCount / (events.length * 2);
        const avgVariance = totalVariance / (events.length * 2);
        
        // Sentiment calculation based on market stability
        let sentiment = 'NEUTRAL';
        if (consensusRatio > 0.6 && avgVariance < 0.5) {
            sentiment = 'BULLISH';
        } else if (consensusRatio < 0.3 || avgVariance > 1.0) {
            sentiment = 'BEARISH';
        }
        
        return {
            sentiment,
            confidence: Math.min(100, avgBookmakers * 10),
            stability: Math.max(0, 100 - (avgVariance * 50)),
            consensus: consensusRatio * 100
        };
    }

    findValueBets(events, minProbability = 60, minConsensus = 70) {
        const valueBets = [];
        
        events.forEach(event => {
            const analyses = this.analyzeEvent(event);
            analyses.forEach(analysis => {
                const prob = parseFloat(analysis.impliedProbability) || 0;
                const consensus = parseFloat(analysis.consensus) || 0;
                const valueRating = analysis.valueRating || 0;
                
                if (prob >= minProbability && consensus >= minConsensus && valueRating > 65) {
                    valueBets.push({
                        game: `${event.away_team} @ ${event.home_team}`,
                        outcome: analysis.outcome,
                        probability: prob,
                        consensus: consensus,
                        odds: analysis.averageOdds,
                        valueRating: valueRating,
                        recommendation: this.generateRecommendation(prob, consensus, valueRating)
                    });
                }
            });
        });
        
        return valueBets.sort((a, b) => b.valueRating - a.valueRating);
    }

    getConsensusAnalysis(events) {
        if (!events || events.length === 0) return null;
        
        const consensusData = {
            high: 0,
            medium: 0,
            low: 0,
            total: 0
        };
        
        events.forEach(event => {
            const analyses = this.analyzeEvent(event);
            analyses.forEach(analysis => {
                const consensus = parseFloat(analysis.consensus) || 0;
                consensusData.total++;
                
                if (consensus > 80) {
                    consensusData.high++;
                } else if (consensus > 60) {
                    consensusData.medium++;
                } else {
                    consensusData.low++;
                }
            });
        });
        
        return {
            high: Math.round((consensusData.high / consensusData.total) * 100),
            medium: Math.round((consensusData.medium / consensusData.total) * 100),
            low: Math.round((consensusData.low / consensusData.total) * 100),
            totalOutcomes: consensusData.total
        };
    }
}

const analyzer = new OddsAnalyzer();
