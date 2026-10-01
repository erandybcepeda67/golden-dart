// Audio Synthesizer Class
class AudioController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playThrow() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playHit() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playBullseye() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.5);
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }
}

const audio = new AudioController();
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

let state = {
    coins: 1250, level: 1, xp: 0,
    doubleOut: true, aiDifficulty: 'easy', sfx: true,
    selectedFlight: 'gold', selectedBarrel: 'gold', selectedBoard: 'classic',
    ownedFlights: ['default', 'gold'], ownedBarrels: ['default', 'gold'], ownedBoards: ['classic'],
    mode: '301', activeTurn: 1, dartsLeft: 3, turnScore: 0,
    p1Score: 301, p2Score: 301, p1TotalThrows: 0, p1TotalPoints: 0,
    cricketP1: {15:0, 16:0, 17:0, 18:0, 19:0, 20:0, 25:0},
    cricketP2: {15:0, 16:0, 17:0, 18:0, 19:0, 20:0, 25:0},
    stats: { throws: 0, bulls: 0, highTurn: 0 },
    wind: { x: 0, y: 0 }
};

let canvas, ctx;
let boardCenter = { x: 0, y: 0 };
let boardRadius = 180;
let activeDart = null;
let stuckDarts = [];
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };

const SHOP_DATA = {
    flights: [
        { id: 'default', name: 'Standard Red', price: 0, color: '#ef4444' },
        { id: 'gold', name: 'Golden Wings', price: 300, color: '#f59e0b' },
        { id: 'neon', name: 'Cyber Neon', price: 600, color: '#06b6d4' },
        { id: 'shadow', name: 'Shadow Obsidian', price: 1000, color: '#3b82f6' }
    ],
    barrels: [
        { id: 'default', name: 'Steel Barrel', price: 0, color: '#9ca3af' },
        { id: 'gold', name: 'Golden Barrel', price: 500, color: '#fbbf24' },
        { id: 'titanium', name: 'Titanium Blue', price: 900, color: '#2563eb' }
    ],
    boards: [
        { id: 'classic', name: 'Classic Tournament', price: 0, double: '#dc2626', triple: '#16a34a', single1: '#111827', single2: '#fef3c7' },
        { id: 'midnight', name: 'Midnight Cyber', price: 800, double: '#a855f7', triple: '#06b6d4', single1: '#0f172a', single2: '#334155' },
        { id: 'gold_vip', name: 'Golden VIP Arena', price: 1500, double: '#b45309', triple: '#f59e0b', single1: '#18181b', single2: '#3f3f46' }
    ]
};

window.onload = function() {
    loadSavedData();
    initCanvas();
    setupEventListeners();
    updateUI();
    generateWind();
    renderShopGrid('flights');
    renderLeaderboards();

    window.addEventListener('resize', initCanvas);
    requestAnimationFrame(gameLoop);
};

function loadSavedData() {
    const saved = localStorage.getItem('golden_dart_data');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.coins = parsed.coins ?? 1250;
            state.level = parsed.level ?? 1;
            state.xp = parsed.xp ?? 0;
            state.ownedFlights = parsed.ownedFlights ?? ['default', 'gold'];
            state.ownedBarrels = parsed.ownedBarrels ?? ['default', 'gold'];
            state.ownedBoards = parsed.ownedBoards ?? ['classic'];
            state.selectedFlight = parsed.selectedFlight ?? 'gold';
            state.selectedBarrel = parsed.selectedBarrel ?? 'gold';
            state.selectedBoard = parsed.selectedBoard ?? 'classic';
            state.stats = parsed.stats ?? { throws: 0, bulls: 0, highTurn: 0 };
        } catch(e) {
            console.error("Save state error:", e);
        }
    }
}

function saveData() {
    localStorage.setItem('golden_dart_data', JSON.stringify({
        coins: state.coins, level: state.level, xp: state.xp,
        ownedFlights: state.ownedFlights, ownedBarrels: state.ownedBarrels, ownedBoards: state.ownedBoards,
        selectedFlight: state.selectedFlight, selectedBarrel: state.selectedBarrel, selectedBoard: state.selectedBoard,
        stats: state.stats
    }));
}

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    boardCenter = { x: canvas.width / 2, y: canvas.height / 2 - 20 };
    boardRadius = Math.min(canvas.width, canvas.height) * 0.38;
    if (boardRadius > 220) boardRadius = 220;
    if (boardRadius < 130) boardRadius = 130;
}

function generateWind() {
    if (state.mode === 'practice') {
        state.wind = { x: 0, y: 0, speed: 0 };
    } else {
        const speed = (Math.random() * 3.5).toFixed(1);
        const angle = Math.random() * Math.PI * 2;
        state.wind = {
            speed: parseFloat(speed),
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
    }
    document.getElementById('wind-val').innerText = `${state.wind.speed.toFixed(1)} mph`;
}

function drawDartboard() {
    const theme = SHOP_DATA.boards.find(b => b.id === state.selectedBoard) || SHOP_DATA.boards[0];
    const cx = boardCenter.x;
    const cy = boardCenter.y;
    const r = boardRadius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
    const woodGrad = ctx.createRadialGradient(cx, cy, r * 1.05, cx, cy, r * 1.25);
    woodGrad.addColorStop(0, '#2c1810');
    woodGrad.addColorStop(0.5, '#120a06');
    woodGrad.addColorStop(1, '#050302');
    ctx.fillStyle = woodGrad;
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0f12';
    ctx.fill();

    const doubleOuter = r, doubleInner = r * 0.91, tripleOuter = r * 0.62, tripleInner = r * 0.53;
    const outerBull = r * 0.14, innerBull = r * 0.06;
    const angleStep = (Math.PI * 2) / 20;
    const startOffset = -Math.PI / 2 - (angleStep / 2);

    for (let i = 0; i < 20; i++) {
        const a1 = startOffset + i * angleStep;
        const a2 = a1 + angleStep;
        const isEven = i % 2 === 0;
        const singleColor = isEven ? theme.single1 : theme.single2;
        const ringColor = isEven ? theme.double : theme.triple;

        drawSectorSlice(cx, cy, doubleInner, tripleOuter, a1, a2, singleColor);
        drawSectorSlice(cx, cy, tripleInner, outerBull, a1, a2, singleColor);
        drawSectorSlice(cx, cy, doubleOuter, doubleInner, a1, a2, ringColor);
        drawSectorSlice(cx, cy, tripleOuter, tripleInner, a1, a2, ringColor);

        const midAngle = a1 + angleStep / 2;
        const numX = cx + Math.cos(midAngle) * (r * 1.13);
        const numY = cy + Math.sin(midAngle) * (r * 1.13);
        ctx.fillStyle = '#f3f4f6';
        ctx.font = `bold ${Math.max(12, Math.floor(r * 0.11))}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(SECTORS[i].toString(), numX, numY);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, outerBull, 0, Math.PI * 2);
    ctx.fillStyle = theme.triple;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, innerBull, 0, Math.PI * 2);
    ctx.fillStyle = theme.double;
    ctx.fill();

    ctx.restore();
}

function drawSectorSlice(cx, cy, rOuter, rInner, a1, a2, color) {
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, a1, a2, false);
    ctx.arc(cx, cy, rInner, a2, a1, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawDarts() {
    stuckDarts.forEach(d => drawSingleDart(d.x, d.y, 0.45, d.flight, d.barrel));
    if (activeDart) drawSingleDart(activeDart.x, activeDart.y, activeDart.scale, activeDart.flight, activeDart.barrel);
}

function drawSingleDart(x, y, scale, flightId, barrelId) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const flightCfg = SHOP_DATA.flights.find(f => f.id === flightId) || SHOP_DATA.flights[0];
    const barrelCfg = SHOP_DATA.barrels.find(b => b.id === barrelId) || SHOP_DATA.barrels[0];

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(8, 25, 6, 18, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -22);
    ctx.stroke();

    ctx.fillStyle = barrelCfg.color;
    ctx.fillRect(-3, -50, 6, 28);

    ctx.fillStyle = flightCfg.color;
    ctx.beginPath();
    ctx.moveTo(0, -70); ctx.lineTo(-18, -100); ctx.lineTo(0, -90); ctx.lineTo(18, -100);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function setupEventListeners() {
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function onPointerDown(e) {
    if (activeDart || state.dartsLeft <= 0 || state.activeTurn !== 1) return;
    e.preventDefault();
    isDragging = true;
    dragStart = getCanvasCoords(e);
    dragCurrent = { ...dragStart };
}

function onPointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    dragCurrent = getCanvasCoords(e);
}

function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;

    if (dy > 20) {
        throwDart(-dx * 0.12, -dy * 0.18);
    }
}

function throwDart(vx, vy) {
    audio.playThrow();
    activeDart = {
        x: canvas.width / 2, y: canvas.height - 60,
        vx: vx + state.wind.x * 0.8, vy: vy,
        scale: 1.2, targetScale: 0.45,
        flight: state.selectedFlight, barrel: state.selectedBarrel,
        progress: 0
    };
    document.getElementById('swipe-hint').classList.add('opacity-0');
}

function simulateAiThrow() {
    if (state.dartsLeft <= 0 || state.activeTurn !== 2) return;
    document.getElementById('turn-announcement').innerText = "OPPONENT THROWING...";

    setTimeout(() => {
        if (state.activeTurn !== 2) return;
        audio.playThrow();
        let spread = state.aiDifficulty === 'hard' ? 12 : state.aiDifficulty === 'medium' ? 28 : 50;
        const targetX = boardCenter.x + (Math.random() - 0.5) * spread;
        const targetY = boardCenter.y - (boardRadius * 0.5) + (Math.random() - 0.5) * spread;

        activeDart = {
            x: canvas.width / 2, y: canvas.height - 60,
            targetX, targetY, scale: 1.2, targetScale: 0.45,
            flight: 'default', barrel: 'default', isAi: true, progress: 0
        };
    }, 900);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDartboard();

    if (isDragging) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(dragCurrent.x, dragCurrent.y);
        ctx.strokeStyle = 'rgba(255, 202, 40, 0.6)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.restore();
    }

    if (activeDart) {
        activeDart.progress += 0.05;
        if (activeDart.isAi) {
            activeDart.x += (activeDart.targetX - activeDart.x) * 0.15;
            activeDart.y += (activeDart.targetY - activeDart.y) * 0.15;
        } else {
            activeDart.x += activeDart.vx;
            activeDart.y += activeDart.vy;
            activeDart.vy += 0.25;
        }
        activeDart.scale += (activeDart.targetScale - activeDart.scale) * 0.1;

        if (activeDart.progress >= 1 || (activeDart.isAi && Math.abs(activeDart.x - activeDart.targetX) < 2)) {
            onDartImpact(activeDart.x, activeDart.y);
            activeDart = null;
        }
    }

    drawDarts();
    requestAnimationFrame(gameLoop);
}

function onDartImpact(x, y) {
    const hitResult = calculateScore(x, y);
    stuckDarts.push({
        x, y,
        flight: state.activeTurn === 1 ? state.selectedFlight : 'default',
        barrel: state.activeTurn === 1 ? state.selectedBarrel : 'default'
    });

    if (hitResult.type === 'INNER_BULL') {
        audio.playBullseye();
        state.stats.bulls++;
    } else {
        audio.playHit();
    }

    processScoreRules(hitResult);
    state.dartsLeft--;
    state.stats.throws++;
    updateUI();
    showHitBanner(hitResult);

    if (state.dartsLeft <= 0) {
        setTimeout(endTurn, 1200);
    } else if (state.activeTurn === 2) {
        simulateAiThrow();
    }
    saveData();
}

function calculateScore(x, y) {
    const dx = x - boardCenter.x, dy = y - boardCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = boardRadius;

    if (dist > r) return { points: 0, label: 'MISS', type: 'MISS', val: 0 };
    if (dist <= r * 0.06) return { points: 50, label: 'DOUBLE BULL', type: 'INNER_BULL', val: 25, mult: 2 };
    if (dist <= r * 0.14) return { points: 25, label: 'OUTER BULL', type: 'OUTER_BULL', val: 25, mult: 1 };

    let angle = Math.atan2(dy, dx) + Math.PI / 2 + (Math.PI / 20);
    if (angle < 0) angle += Math.PI * 2;
    const sectorVal = SECTORS[Math.floor((angle / (Math.PI * 2)) * 20) % 20];

    if (dist >= r * 0.91 && dist <= r) return { points: sectorVal * 2, label: `DOUBLE ${sectorVal}`, type: 'DOUBLE', val: sectorVal, mult: 2 };
    if (dist >= r * 0.53 && dist <= r * 0.62) return { points: sectorVal * 3, label: `TRIPLE ${sectorVal}`, type: 'TRIPLE', val: sectorVal, mult: 3 };

    return { points: sectorVal, label: `SINGLE ${sectorVal}`, type: 'SINGLE', val: sectorVal, mult: 1 };
}

function processScoreRules(hit) {
    const isP1 = state.activeTurn === 1;
    let currentScore = isP1 ? state.p1Score : state.p2Score;

    if (state.mode === '301' || state.mode === '501') {
        const remaining = currentScore - hit.points;
        let bust = remaining < 0 || (remaining === 1 && state.doubleOut) || (remaining === 0 && state.doubleOut && hit.type !== 'DOUBLE' && hit.type !== 'INNER_BULL');

        if (bust) {
            showHitBanner({ label: 'BUST!', points: 0 });
        } else {
            if (isP1) {
                state.p1Score = remaining;
                state.p1TotalPoints += hit.points;
                state.p1TotalThrows++;
            } else {
                state.p2Score = remaining;
            }
            state.turnScore += hit.points;
            if (remaining === 0) triggerVictory(isP1 ? 'PLAYER 1' : 'OPPONENT');
        }
    }
}

function endTurn() {
    stuckDarts = [];
    state.dartsLeft = 3;
    state.turnScore = 0;

    if (state.mode !== 'practice') {
        state.activeTurn = state.activeTurn === 1 ? 2 : 1;
        generateWind();
    }

    updateUI();
    if (state.activeTurn === 2) simulateAiThrow();
    else document.getElementById('turn-announcement').innerText = "YOUR TURN";
}

function showHitBanner(hit) {
    const banner = document.getElementById('hit-banner');
    document.getElementById('hit-score-text').innerText = hit.label;
    document.getElementById('hit-points-sub').innerText = `+${hit.points} PTS`;

    banner.classList.remove('opacity-0', '-translate-y-12');
    banner.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
        banner.classList.remove('opacity-100', 'translate-y-0');
        banner.classList.add('opacity-0', '-translate-y-12');
    }, 900);
}

function updateUI() {
    document.getElementById('player-coins').innerText = state.coins.toLocaleString();
    document.getElementById('player-level').innerText = state.level;
    document.getElementById('p1-score').innerText = state.p1Score;
    document.getElementById('p2-score').innerText = state.p2Score;

    updateDartIcons('p1-darts-left', state.activeTurn === 1 ? state.dartsLeft : 3);
    updateDartIcons('p2-darts-left', state.activeTurn === 2 ? state.dartsLeft : 3);
}

function updateDartIcons(elementId, count) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const icon = document.createElement('i');
        icon.className = `fa-solid fa-location-arrow rotate-45 text-xs ${i < count ? 'text-gold-400' : 'text-gray-700'}`;
        container.appendChild(icon);
    }
}

function startGameMode(mode) {
    audio.playClick();
    state.mode = mode;
    state.activeTurn = 1;
    state.dartsLeft = 3;
    stuckDarts = [];

    document.getElementById('game-mode-badge').innerText = mode.toUpperCase();
    document.getElementById('modal-menu').classList.add('hidden');

    const startPts = mode === '501' ? 501 : 301;
    state.p1Score = startPts;
    state.p2Score = startPts;

    generateWind();
    updateUI();
}

function setAiDifficulty(diff) {
    audio.playClick();
    state.aiDifficulty = diff;
    document.getElementById('p2-name').innerText = `BOT ${diff.toUpperCase()}`;
}

function triggerVictory(winner) {
    document.getElementById('winner-title').innerText = winner.includes('PLAYER') ? 'VICTORY!' : 'DEFEAT';
    document.getElementById('modal-gameover').classList.remove('hidden');
}

function closeModal(id) { audio.playClick(); document.getElementById(id).classList.add('hidden'); }
function closeMatchSummary() { closeModal('modal-gameover'); document.getElementById('modal-menu').classList.remove('hidden'); }
function resetMatch() { closeModal('modal-settings'); document.getElementById('modal-menu').classList.remove('hidden'); }
function toggleAudio() { state.sfx = !state.sfx; audio.enabled = state.sfx; }
function toggleDoubleOut() { state.doubleOut = !state.doubleOut; }

function renderShopGrid(tab) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    SHOP_DATA[tab].forEach(item => {
        const card = document.createElement('div');
        card.className = "p-3 rounded-2xl glass-panel border border-gray-800 flex flex-col items-center text-center justify-between";
        card.innerHTML = `<div class="font-bold text-white text-xs mb-1">${item.name}</div>`;
        grid.appendChild(card);
    });
}

function switchShopTab(tab) { renderShopGrid(tab); }
function renderLeaderboards() {}

// Navigation Controls
document.getElementById('btn-nav-play').onclick = () => document.getElementById('modal-menu').classList.remove('hidden');
document.getElementById('btn-nav-shop').onclick = () => document.getElementById('modal-shop').classList.remove('hidden');
document.getElementById('btn-nav-leaderboard').onclick = () => document.getElementById('modal-leaderboard').classList.remove('hidden');
document.getElementById('btn-settings').onclick = () => document.getElementById('modal-settings').classList.remove('hidden');