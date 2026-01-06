// グローバル変数
let tempChart, humidityChart, co2Chart;
let currentTimeRange = 1; // デフォルト1時間
let updateInterval;

// API設定
const API_BASE_URL = 'https://nodered.aosy-minipc.theworkpc.com';
const API_CURRENT = `${API_BASE_URL}/api/sensor/current`;
const API_HISTORY = `${API_BASE_URL}/api/sensor/history`;

// Chart.js共通設定
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#666',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            padding: 10,
            displayColors: false
        }
    },
    scales: {
        x: {
            type: 'time',
            time: {
                displayFormats: {
                    hour: 'HH:mm',
                    day: 'MM/dd'
                }
            },
            grid: {
                display: false
            },
            ticks: {
                color: '#9ca3af',
                font: { size: 10 }
            }
        },
        y: {
            grid: {
                color: '#f3f4f6',
                borderDash: [4, 4]
            },
            ticks: {
                color: '#9ca3af',
                font: { size: 10 }
            },
            border: {
                display: false
            }
        }
    }
};

// グラフ初期化
function initCharts() {
    const createChart = (id, label, color) => {
        const ctx = document.getElementById(id).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: color,
                    borderWidth: 2,
                    backgroundColor: color + '10', // 透明度追加
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: chartOptions
        });
    };

    tempChart = createChart('tempChart', '温度', '#ef4444');  // 赤
    humidityChart = createChart('humidityChart', '湿度', '#3b82f6'); // 青
    co2Chart = createChart('co2Chart', 'CO2', '#10b981');    // 緑
}

// 現在値更新
async function updateCurrentValues() {
    try {
        const response = await fetch(API_CURRENT);
        if (!response.ok) {
            throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        // データが取得できた場合のみ値を更新
        if (data.temperature !== null && data.temperature !== undefined) {
            updateValue('current-temp', data.temperature.toFixed(1));
        } else {
            updateValue('current-temp', 'データなし');
        }
        
        if (data.humidity !== null && data.humidity !== undefined) {
            updateValue('current-humidity', data.humidity.toFixed(1));
        } else {
            updateValue('current-humidity', 'データなし');
        }
        
        if (data.co2 !== null && data.co2 !== undefined) {
            updateValue('current-co2', Math.round(data.co2));
        } else {
            updateValue('current-co2', 'データなし');
        }

        // 時刻更新
        const date = new Date(data.timestamp);
        document.getElementById('current-time').textContent = date.toLocaleTimeString('ja-JP');
        document.getElementById('current-date').textContent = date.toLocaleDateString('ja-JP');

        updateStatus('正常稼働中', false);
    } catch (error) {
        console.error('データ取得エラー:', error);
        // エラー時は明確に「取得失敗」と表示
        updateValue('current-temp', '取得失敗');
        updateValue('current-humidity', '取得失敗');
        updateValue('current-co2', '取得失敗');
        updateStatus(`エラー: ${error.message}`, true);
    }
}

function updateValue(id, value) {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
}

function updateStatus(msg, isError) {
    const el = document.getElementById('status');
    if(el) {
        el.textContent = msg;
        if(isError) el.classList.add('error');
        else el.classList.remove('error');
    }
}

// 履歴データ更新
async function updateHistoryData() {
    try {
        const response = await fetch(`${API_HISTORY}?hours=${currentTimeRange}`);
        if (!response.ok) {
            throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        // データが配列でない、または空の場合
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('履歴データが存在しません');
        }

        const updateDataset = (chart, key) => {
            chart.data.datasets[0].data = data.map(d => ({ 
                x: new Date(d.timestamp), 
                y: d[key] 
            })).filter(d => d.y !== null && d.y !== undefined); // null/undefined値を除外
            chart.update('none'); // アニメーションなしで更新
        };

        updateDataset(tempChart, 'temperature');
        updateDataset(humidityChart, 'humidity');
        updateDataset(co2Chart, 'co2');

    } catch (error) {
        console.error('履歴データ取得エラー:', error);
        // エラー時はグラフをクリア
        [tempChart, humidityChart, co2Chart].forEach(chart => {
            chart.data.datasets[0].data = [];
            chart.update('none');
        });
        updateStatus(`履歴データエラー: ${error.message}`, true);
    }
}

// 時間範囲変更
window.changeTimeRange = function(hours) {
    currentTimeRange = hours;
    
    // ボタンのスタイル更新
    document.querySelectorAll('.controls button').forEach(btn => {
        btn.classList.remove('active');
    });
    // event.targetが参照できない場合のガードが必要だが、inline onclickから呼ばれる前提
    if(event && event.target) {
        event.target.classList.add('active');
    }

    // X軸の時間表示フォーマットを更新
    const timeFormat = hours <= 12 ? 'HH:mm' : 'MM/dd HH:mm';
    const timeUnit = hours <= 12 ? 'hour' : 'day';
    
    [tempChart, humidityChart, co2Chart].forEach(chart => {
        chart.options.scales.x.time.unit = timeUnit;
        chart.options.scales.x.time.displayFormats = {
            hour: 'HH:mm',
            day: 'MM/dd HH:mm'
        };
    });

    updateHistoryData();
};



// 初期化プロセス
async function init() {
    // ローディング表示
    updateStatus('データ読み込み中...', false);
    updateValue('current-temp', '---');
    updateValue('current-humidity', '---');
    updateValue('current-co2', '---');
    
    initCharts();
    await updateCurrentValues();
    await updateHistoryData();

    // 定期更新
    updateInterval = setInterval(async () => {
        await updateCurrentValues();
        await updateHistoryData();
    }, 30000);
}

// 起動
window.addEventListener('load', init);
window.addEventListener('beforeunload', () => {
    if (updateInterval) clearInterval(updateInterval);
});
