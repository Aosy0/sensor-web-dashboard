// グローバル変数
let tempChart, humidityChart, co2Chart;
let currentTimeRange = 1; // デフォルト1時間
let updateInterval;

// API設定
const API_BASE_URL = window.location.origin;
// 実際の環境に合わせてパスを調整してください
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
        const data = generateMockCurrentData(); // モック
        
        // 値の更新
        updateValue('current-temp', data.temperature.toFixed(1));
        updateValue('current-humidity', data.humidity.toFixed(1));
        updateValue('current-co2', Math.round(data.co2));

        // 時刻更新
        const date = new Date(data.timestamp);
        document.getElementById('current-time').textContent = date.toLocaleTimeString('ja-JP');
        document.getElementById('current-date').textContent = date.toLocaleDateString('ja-JP');

        updateStatus('正常稼働中', false);
    } catch (error) {
        console.error('Fetch error:', error);
        updateStatus('データ取得エラー', true);
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
        const data = generateMockHistoryData(currentTimeRange); // モック

        const updateDataset = (chart, key) => {
            chart.data.datasets[0].data = data.map(d => ({ x: d.timestamp, y: d[key] }));
            chart.update('none'); // アニメーションなしで更新
        };

        updateDataset(tempChart, 'temperature');
        updateDataset(humidityChart, 'humidity');
        updateDataset(co2Chart, 'co2');

    } catch (error) {
        console.error('History fetch error:', error);
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

    updateHistoryData();
};

// --- モックデータ生成 (テスト用) ---
function generateMockCurrentData() {
    return {
        temperature: 20 + Math.random() * 5,
        humidity: 40 + Math.random() * 20,
        co2: 400 + Math.random() * 400,
        timestamp: new Date().toISOString()
    };
}

function generateMockHistoryData(hours) {
    const data = [];
    const now = new Date();
    // データ点数を調整
    const points = 100;
    const interval = (hours * 60 * 60 * 1000) / points;

    for (let i = points; i >= 0; i--) {
        const time = new Date(now - i * interval);
        data.push({
            timestamp: time.toISOString(),
            temperature: 22 + Math.sin(i / 10) * 2 + Math.random(),
            humidity: 50 + Math.cos(i / 8) * 10 + Math.random() * 5,
            co2: 600 + Math.sin(i / 20) * 200 + Math.random() * 50
        });
    }
    return data;
}

// 初期化プロセス
async function init() {
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
