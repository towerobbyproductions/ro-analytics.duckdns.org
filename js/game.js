// js/game.js - логика для страницы игры

let charts = {};
let currentLang = 'en';
let currentChartType = 'line';
let updateInterval;

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    startAutoUpdate();
    setupEventListeners();
});

async function loadAllData(showRefresh = false) {
    try {
        if (showRefresh) showToast('Updating data...', 'info');
        
        await Promise.all([
            loadCurrentStats(),
            loadHistoricalData(),
            loadRecords(),
            loadPeakHours(),
            loadWeekdayDistribution(),
            loadWeeklyComparison(),
            loadPredictions(),
            loadTrends(),
            loadCorrelations()
        ]);
        
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
        
        if (showRefresh) showToast('Data updated!', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'danger');
    }
}

async function loadCurrentStats() {
    const data = await API.getGameCurrentStats(GAME_CONFIG.universeId);
    
    document.getElementById('currentOnline').textContent = utils.formatNumber(data.current);
    document.getElementById('allTimePeak').textContent = utils.formatNumber(data.all_time_peak);
    document.getElementById('peakDate').textContent = data.all_time_peak_date ? 
        new Date(data.all_time_peak_date).toLocaleDateString() : '-';
    document.getElementById('totalVisits').textContent = utils.formatNumber(data.total_visits);
    document.getElementById('favorites').textContent = utils.formatNumber(data.favorites);
    
    // Анимация обновления
    utils.highlightElement(document.getElementById('currentOnline'));
}

async function loadHistoricalData() {
    const data = await API.getGameHistorical(GAME_CONFIG.universeId, 24);
    
    const labels = data.map(d => new Date(d.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    }));
    const values = data.map(d => d.avg);
    
    createMainChart(labels, values);
}

async function loadRecords() {
    const data = await API.getGameRecords(GAME_CONFIG.universeId, 20);
    
    const tbody = document.getElementById('recordsTable');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No records found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map((record, index) => {
        const prevValue = index < data.length - 1 ? data[index + 1].value : record.value;
        const diff = record.value - prevValue;
        
        return `
            <tr>
                <td>${new Date(record.recorded_at).toLocaleDateString()}</td>
                <td>${record.record_type}</td>
                <td class="font-bold">${utils.formatNumber(record.value)}</td>
                <td class="${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}">
                    ${diff > 0 ? '+' : ''}${utils.formatNumber(diff)}
                </td>
            </tr>
        `;
    }).join('');
}

async function loadPeakHours() {
    const data = await API.getGamePeakHours(GAME_CONFIG.universeId);
    
    const container = document.getElementById('peakHours');
    if (data.length === 0) {
        container.innerHTML = '<p class="text-secondary">No data available</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="flex items-center justify-between p-3 bg-secondary rounded-lg" style="background-color: var(--bg-tertiary);">
            <div class="flex items-center gap-3">
                <span class="text-lg font-bold" style="color: var(--accent-color);">#${item.rank}</span>
                <span>${item.formatted_hour}</span>
            </div>
            <span class="font-semibold">${utils.formatNumber(item.peak_players)}</span>
        </div>
    `).join('');
}

async function loadWeeklyComparison() {
    const data = await API.getGameWeeklyComparison(GAME_CONFIG.universeId);
    
    const labels = data.map(d => d.formatted_date);
    const values = data.map(d => d.avg_players);
    
    createSmallChart('weeklyChart', labels, values, 'Avg Players');
}

async function loadWeekdayDistribution() {
    const data = await API.getGameWeekdayDistribution(GAME_CONFIG.universeId, 6);
    
    const labels = data.map(d => d.short_name);
    const values = data.map(d => d.avg_players);
    
    createSmallChart('weekdayChart', labels, values, 'Avg Players');
}

async function loadPredictions() {
    const data = await API.getGamePrediction(GAME_CONFIG.universeId, 12);
    
    const container = document.getElementById('predictions');
    if (data.error) {
        container.innerHTML = `<p class="text-secondary">${data.error}</p>`;
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <span>Next 12h trend:</span>
                <span class="badge ${data.trend === 'up' ? 'badge-success' : data.trend === 'down' ? 'badge-danger' : 'badge-warning'}">
                    ${data.trend === 'up' ? '📈 Growing' : data.trend === 'down' ? '📉 Declining' : '➡️ Stable'}
                </span>
            </div>
            <div class="flex justify-between">
                <span>Peak predicted:</span>
                <span class="font-bold">${utils.formatNumber(Math.max(...data.predictions.map(p => p.predicted_players)))}</span>
            </div>
            <div class="flex justify-between">
                <span>Avg change/hour:</span>
                <span class="${data.avg_hourly_change > 0 ? 'positive' : 'negative'}">
                    ${data.avg_hourly_change > 0 ? '+' : ''}${data.avg_hourly_change.toFixed(1)}
                </span>
            </div>
            <div class="mt-3">
                ${data.predictions.slice(0, 3).map(p => `
                    <div class="flex justify-between text-sm">
                        <span>${new Date(p.time).toLocaleTimeString()}</span>
                        <span>${utils.formatNumber(p.predicted_players)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadTrends() {
    const data = await API.getGameTrends(GAME_CONFIG.universeId, 7);
    
    const container = document.getElementById('trends');
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between">
                <span>7-day trend:</span>
                <span class="badge ${data.trend.direction === 'growing' ? 'badge-success' : data.trend.direction === 'declining' ? 'badge-danger' : 'badge-warning'}">
                    ${data.trend.direction}
                </span>
            </div>
            <div class="flex justify-between">
                <span>Daily change:</span>
                <span class="${data.trend.slope > 0 ? 'positive' : 'negative'}">
                    ${data.trend.slope > 0 ? '+' : ''}${data.trend.slope.toFixed(2)} players/day
                </span>
            </div>
            <div class="mt-3">
                <div class="flex justify-between text-sm font-bold">
                    <span>Day</span>
                    <span>Avg</span>
                    <span>Peak</span>
                </div>
                ${data.daily.slice(-5).map(d => `
                    <div class="flex justify-between text-sm">
                        <span>${new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span>${utils.formatNumber(d.avg)}</span>
                        <span>${utils.formatNumber(d.max)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function loadCorrelations() {
    const data = await API.getGameCorrelation(GAME_CONFIG.universeId);
    
    const container = document.getElementById('correlations');
    if (data.error) {
        container.innerHTML = `<p class="text-secondary">${data.error}</p>`;
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-3">
            <div>
                <div class="flex justify-between">
                    <span>Online vs Visits:</span>
                    <span class="font-bold">${(data.online_vs_visits * 100).toFixed(1)}%</span>
                </div>
                <div class="text-sm text-secondary">${data.interpretation.online_vs_visits}</div>
            </div>
            <div>
                <div class="flex justify-between">
                    <span>Online vs Favorites:</span>
                    <span class="font-bold">${(data.online_vs_favorites * 100).toFixed(1)}%</span>
                </div>
                <div class="text-sm text-secondary">${data.interpretation.online_vs_favorites}</div>
            </div>
            <div class="mt-3 p-3" style="background-color: var(--bg-tertiary); border-radius: 0.5rem;">
                <div class="text-sm">
                    ${data.online_vs_visits > 0.7 ? 
                        'Strong positive correlation: More players = more visits' : 
                        data.online_vs_visits < -0.3 ? 
                        'Negative correlation' : 
                        'No strong correlation'}
                </div>
            </div>
        </div>
    `;
}

function createMainChart(labels, data) {
    const ctx = document.getElementById('onlineChart').getContext('2d');
    
    if (charts.main) charts.main.destroy();
    
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#fff' : '#333';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    charts.main = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels,
            datasets: [{
                label: 'Players',
                data,
                borderColor: '#00A2FF',
                backgroundColor: currentChartType === 'bar' 
                    ? 'rgba(0,162,255,0.5)' 
                    : 'rgba(0,162,255,0.1)',
                tension: 0.4,
                fill: currentChartType === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, maxRotation: 45 }
                }
            }
        }
    });
}

function createSmallChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (charts[canvasId]) charts[canvasId].destroy();
    
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#fff' : '#333';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data,
                backgroundColor: 'rgba(0,162,255,0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

function setupEventListeners() {
    document.getElementById('refreshData').addEventListener('click', () => loadAllData(true));
    
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-type-btn').forEach(b => {
                b.classList.remove('active', 'bg-roblox-blue', 'text-white');
            });
            btn.classList.add('active', 'bg-roblox-blue', 'text-white');
            currentChartType = btn.dataset.type;
            updateCharts();
        });
    });
    
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const icon = document.querySelector('#themeToggle i');
        if (document.documentElement.classList.contains('dark')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
        updateCharts();
    });
}

function updateCharts() {
    if (!charts.main) return;
    charts.main.config.type = currentChartType;
    charts.main.data.datasets[0].backgroundColor = currentChartType === 'bar' 
        ? 'rgba(0,162,255,0.5)' 
        : 'rgba(0,162,255,0.1)';
    charts.main.update();
}

function startAutoUpdate() {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => loadAllData(), 300000); // 5 минут
}
