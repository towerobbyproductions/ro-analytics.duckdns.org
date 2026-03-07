// js/api.js - работа с Google Apps Script API

const API = {
    baseUrl: GAME_CONFIG.apiUrl,
    token: GAME_CONFIG.apiToken,
    
    // Универсальный метод для GET запросов
    async get(action, params = {}) {
        const url = new URL(this.baseUrl);
        url.searchParams.set('action', action);
        url.searchParams.set('token', this.token);
        url.searchParams.set('origin', window.location.origin);
        
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API GET error (${action}):`, error);
            throw error;
        }
    },
    
    // Универсальный метод для POST запросов
    async post(action, data = {}) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    token: this.token,
                    origin: window.location.origin,
                    ...data
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API POST error (${action}):`, error);
            throw error;
        }
    },
    
    // Методы для работы с одной игрой
    async getGameCurrentStats(universeId) {
        return this.get('get_game_current_stats', { universeId });
    },
    
    async getGameHistorical(universeId, hours = 24) {
        return this.get('get_game_historical', { universeId, hours });
    },
    
    async getGameRecords(universeId, limit = 50) {
        return this.get('get_game_records', { universeId, limit });
    },
    
    async getGamePeakHours(universeId) {
        return this.get('get_game_peak_hours', { universeId });
    },
    
    async getGameWeeklyComparison(universeId) {
        return this.get('get_game_weekly', { universeId });
    },
    
    async getGameWeekdayDistribution(universeId, weeks = 6) {
        return this.get('get_game_weekday', { universeId, weeks });
    },
    
    async getGamePrediction(universeId, hours = 12) {
        return this.get('get_game_prediction', { universeId, hours });
    },
    
    async getGameTrends(universeId, days = 7) {
        return this.get('get_game_trends', { universeId, days });
    },
    
    async getGameCorrelation(universeId) {
        return this.get('get_game_correlation', { universeId });
    },
    
    async getGameVisitsHistory(universeId, days = 30) {
        return this.get('get_game_visits_history', { universeId, days });
    },
    
    async getGameFavoritesHistory(universeId, days = 30) {
        return this.get('get_game_favorites_history', { universeId, days });
    },
    
    // Методы для работы с несколькими играми
    async getAllGamesCurrent(universeIds = []) {
        return this.get('get_all_games_current', { 
            universeIds: universeIds.join(',') 
        });
    },
    
    async getGamesRanking(limit = 100) {
        return this.get('get_games_ranking', { limit });
    },
    
    async getGamesByCategory(category, limit = 50) {
        return this.get('get_games_by_category', { category, limit });
    },
    
    // Методы для вставки данных (для скриптов сбора статистики)
    async insertPlayerStats(data) {
        return this.post('insert_player_stats', { row: data });
    },
    
    async upsertDailyRecord(data) {
        return this.post('upsert_daily_record', { record: data });
    },
    
    async insertHourlyStats(data) {
        return this.post('insert_hourly_stats', data);
    }
};

// Экспорт для использования в других файлах
window.API = API;
