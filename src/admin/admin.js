// Admin dashboard — Socket.IO client + UI logic
(function () {
    'use strict';

    // ── Event Constants ──
    const EVENTS = {
        ADMIN_OPEN_BUZZER: 'admin:openBuzzer',
        ADMIN_CLOSE_BUZZER: 'admin:closeBuzzer',
        ADMIN_RESET_ROUND: 'admin:resetRound',
        ADMIN_NEXT_ROUND: 'admin:nextRound',
        ADMIN_REMOVE_PLAYER: 'admin:removePlayer',
        ADMIN_LOCK_JOINS: 'admin:lockJoins',
        ADMIN_CLEAR_PLAYERS: 'admin:clearPlayers',
        SERVER_PLAYER_JOINED: 'server:playerJoined',
        SERVER_PLAYER_LEFT: 'server:playerLeft',
        SERVER_BUZZ_RECEIVED: 'server:buzzReceived',
        SERVER_ROUND_STATE: 'server:roundState',
        SERVER_PLAYER_LIST: 'server:playerList',
        ROUND_IDLE: 'IDLE',
        ROUND_OPEN: 'OPEN',
        ROUND_CLOSED: 'CLOSED',
    };

    let socket;
    let joinLocked = false;
    let timerInterval = null;
    let timerSeconds = 0;
    let currentState = EVENTS.ROUND_IDLE;

    // ── Sound context (Web Audio API for synthesized sounds) ──
    let audioCtx;

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playTone(freq, duration, type = 'sine') {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) { /* audio not available */ }
    }

    function playRoundStartSound() {
        if (!document.getElementById('sound-round-start').checked) return;
        playTone(880, 0.3, 'sine');
        setTimeout(() => playTone(1100, 0.4, 'sine'), 150);
    }

    function playBuzzSound(isFirst) {
        if (isFirst && !document.getElementById('sound-first-buzz').checked) return;
        if (!isFirst && !document.getElementById('sound-every-buzz').checked) return;
        playTone(isFirst ? 660 : 440, 0.2, 'square');
    }

    function playTimerEndSound() {
        if (!document.getElementById('sound-timer-end').checked) return;
        playTone(523, 0.2, 'square');
        setTimeout(() => playTone(523, 0.2, 'square'), 250);
        setTimeout(() => playTone(523, 0.5, 'square'), 500);
    }

    // ── DOM References ──
    const $joinURL = document.getElementById('join-url');
    const $qrContainer = document.getElementById('qr-container');
    const $roundBadge = document.getElementById('round-badge');
    const $statusBadge = document.getElementById('status-badge');
    const $playerCount = document.getElementById('player-count');
    const $playerList = document.getElementById('player-list');
    const $rankingList = document.getElementById('ranking-list');
    const $timerDisplay = document.getElementById('timer-display');
    const $timerInput = document.getElementById('timer-input');
    const $sessionRound = document.getElementById('session-round');
    const $sessionTotalRounds = document.getElementById('session-total-rounds');
    const $sessionPlayers = document.getElementById('session-players');

    // ── Initialize ──
    async function init() {
        const info = await window.electronAPI.getServerInfo();
        $joinURL.textContent = info.joinURL;
        generateQR(info.joinURL);

        // Connect Socket.IO to admin namespace
        // Load socket.io client from the local server
        const script = document.createElement('script');
        script.src = `http://localhost:${info.port}/socket.io/socket.io.js`;
        script.onload = () => {
            socket = io(`http://localhost:${info.port}/admin`);
            setupSocketEvents();
        };
        document.head.appendChild(script);

        setupUI();
    }

    // ── QR Code (generated in main process via IPC) ──
    async function generateQR(url) {
        const dataURL = await window.electronAPI.generateQR(url);
        if (dataURL) {
            $qrContainer.innerHTML = `<img src="${dataURL}" alt="QR Code" class="w-full h-auto" />`;
        } else {
            $qrContainer.innerHTML = `<p class="text-sm text-text-muted text-center py-8">QR generation failed</p>`;
        }
    }

    // ── Socket Events ──
    function setupSocketEvents() {
        socket.on(EVENTS.SERVER_ROUND_STATE, (data) => {
            currentState = data.state;
            updateRoundUI(data);
        });

        socket.on(EVENTS.SERVER_PLAYER_LIST, (players) => {
            updatePlayerList(players);
        });

        socket.on(EVENTS.SERVER_PLAYER_JOINED, (data) => {
            // Sound or notification handled by player list update
        });

        socket.on(EVENTS.SERVER_BUZZ_RECEIVED, (data) => {
            playBuzzSound(data.rank === 1);
            // Rankings update comes with round state
        });

        socket.on(EVENTS.SERVER_PLAYER_LEFT, (data) => {
            // Player list update will follow
        });
    }

    // ── UI Updates ──
    function updateRoundUI(data) {
        const { state, roundNumber, buzzes } = data;

        // Status badge
        $statusBadge.textContent = state;
        $statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold ';
        if (state === EVENTS.ROUND_OPEN) {
            $statusBadge.className += 'bg-success/20 text-success';
        } else if (state === EVENTS.ROUND_CLOSED) {
            $statusBadge.className += 'bg-danger/20 text-danger';
        } else {
            $statusBadge.className += 'bg-bg-hover text-text-secondary';
        }

        // Round badge
        if (roundNumber !== undefined) {
            $roundBadge.textContent = `Round ${roundNumber}`;
            $sessionRound.textContent = roundNumber;
        }

        // Button states
        const btnOpen = document.getElementById('btn-open');
        const btnClose = document.getElementById('btn-close');

        if (state === EVENTS.ROUND_OPEN) {
            btnOpen.disabled = true;
            btnOpen.classList.remove('animate-pulse-glow');
            btnOpen.classList.add('opacity-30', 'cursor-not-allowed');
            btnClose.disabled = false;
            btnClose.classList.remove('opacity-30', 'cursor-not-allowed');
        } else if (state === EVENTS.ROUND_CLOSED) {
            btnOpen.disabled = true;
            btnOpen.classList.remove('animate-pulse-glow');
            btnOpen.classList.add('opacity-30', 'cursor-not-allowed');
            btnClose.disabled = true;
            btnClose.classList.add('opacity-30', 'cursor-not-allowed');
        } else {
            btnOpen.disabled = false;
            btnOpen.classList.add('animate-pulse-glow');
            btnOpen.classList.remove('opacity-30', 'cursor-not-allowed');
            btnClose.disabled = true;
            btnClose.classList.add('opacity-30', 'cursor-not-allowed');
        }

        // Rankings
        if (buzzes) {
            updateRankings(buzzes);
        }
    }

    function updateRankings(buzzes) {
        if (buzzes.length === 0) {
            $rankingList.innerHTML = '<p class="text-text-muted text-sm text-center py-8">No buzzes yet</p>';
            return;
        }

        $rankingList.innerHTML = buzzes.map((buzz) => {
            let rankColor = 'text-text-primary';
            let rankBg = 'bg-bg-hover';
            let icon = '';
            if (buzz.rank === 1) { rankColor = 'text-rank-1'; rankBg = 'bg-rank-1/10'; icon = '🥇'; }
            else if (buzz.rank === 2) { rankColor = 'text-rank-2'; rankBg = 'bg-rank-2/10'; icon = '🥈'; }
            else if (buzz.rank === 3) { rankColor = 'text-rank-3'; rankBg = 'bg-rank-3/10'; icon = '🥉'; }
            else { icon = `#${buzz.rank}`; }

            return `
        <div class="${rankBg} rounded-xl px-4 py-3 flex items-center gap-3 animate-slide-in">
          <span class="${rankColor} text-lg font-bold w-8 text-center">${icon}</span>
          <span class="text-text-primary font-semibold flex-1">${escapeHTML(buzz.teamName)}</span>
        </div>
      `;
        }).join('');
    }

    function updatePlayerList(players) {
        $playerCount.textContent = `(${players.length})`;
        $sessionPlayers.textContent = players.length;

        if (players.length === 0) {
            $playerList.innerHTML = '<p class="text-text-muted text-sm text-center py-8">Waiting for players to join...</p>';
            return;
        }

        $playerList.innerHTML = players.map((p) => `
      <div class="bg-bg-primary rounded-xl px-3 py-2.5 flex items-center gap-3 animate-fade-in">
        <span class="w-2 h-2 rounded-full ${p.online ? 'bg-success' : 'bg-text-muted'}"></span>
        <span class="text-text-primary text-sm font-medium flex-1 truncate">${escapeHTML(p.teamName)}</span>
        <span class="text-text-muted text-xs">#${p.joinOrder}</span>
        ${p.buzzed ? '<span class="text-warning text-xs font-semibold">BUZZED</span>' : ''}
        <button onclick="removePlayer('${escapeHTML(p.teamName)}')"
          class="text-danger/60 hover:text-danger text-xs transition-colors">✕</button>
      </div>
    `).join('');
    }

    // ── UI Event Handlers ──
    function setupUI() {
        // Round controls
        document.getElementById('btn-open').addEventListener('click', () => {
            socket.emit(EVENTS.ADMIN_OPEN_BUZZER, {});
            playRoundStartSound();
        });

        document.getElementById('btn-close').addEventListener('click', () => {
            socket.emit(EVENTS.ADMIN_CLOSE_BUZZER);
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            socket.emit(EVENTS.ADMIN_RESET_ROUND);
        });

        document.getElementById('btn-next').addEventListener('click', () => {
            const currentRound = parseInt($sessionRound.textContent) || 0;
            $sessionTotalRounds.textContent = currentRound;
            socket.emit(EVENTS.ADMIN_NEXT_ROUND);
        });

        // Copy link
        document.getElementById('btn-copy-link').addEventListener('click', async () => {
            const url = $joinURL.textContent;
            try {
                await navigator.clipboard.writeText(url);
                const btn = document.getElementById('btn-copy-link');
                btn.textContent = '✓ Copied!';
                setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
            } catch (e) {
                // Fallback
                const input = document.createElement('input');
                input.value = url;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
            }
        });

        // Refresh IP
        document.getElementById('btn-refresh-ip').addEventListener('click', async () => {
            const info = await window.electronAPI.refreshIP();
            $joinURL.textContent = info.joinURL;
            generateQR(info.joinURL);
        });

        // Lock joins
        document.getElementById('btn-lock-joins').addEventListener('click', () => {
            joinLocked = !joinLocked;
            socket.emit(EVENTS.ADMIN_LOCK_JOINS, { locked: joinLocked });
            const btn = document.getElementById('btn-lock-joins');
            btn.textContent = joinLocked ? '🔒' : '🔓';
        });

        // Clear players
        document.getElementById('btn-clear-players').addEventListener('click', () => {
            if (confirm('Remove all players?')) {
                socket.emit(EVENTS.ADMIN_CLEAR_PLAYERS);
            }
        });

        // Timer
        document.getElementById('btn-timer-start').addEventListener('click', () => {
            const btn = document.getElementById('btn-timer-start');
            if (timerInterval) {
                // Stop timer
                clearInterval(timerInterval);
                timerInterval = null;
                btn.textContent = 'Start';
                return;
            }

            timerSeconds = parseInt($timerInput.value) || 30;
            updateTimerDisplay(timerSeconds);
            btn.textContent = 'Stop';

            timerInterval = setInterval(() => {
                timerSeconds--;
                updateTimerDisplay(timerSeconds);
                if (timerSeconds <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    btn.textContent = 'Start';
                    // Auto-close buzzer
                    if (currentState === EVENTS.ROUND_OPEN) {
                        socket.emit(EVENTS.ADMIN_CLOSE_BUZZER);
                    }
                    playTimerEndSound();
                }
            }, 1000);
        });

        // Export
        document.getElementById('btn-export-csv').addEventListener('click', () => {
            window.electronAPI.exportCSV();
        });

        document.getElementById('btn-export-json').addEventListener('click', () => {
            window.electronAPI.exportJSON();
        });
    }

    function updateTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        $timerDisplay.textContent =
            String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

        // Color feedback
        if (seconds <= 5 && seconds > 0) {
            $timerDisplay.classList.add('text-danger');
            $timerDisplay.classList.remove('text-warning', 'text-text-primary');
        } else if (seconds <= 10) {
            $timerDisplay.classList.add('text-warning');
            $timerDisplay.classList.remove('text-danger', 'text-text-primary');
        } else {
            $timerDisplay.classList.add('text-text-primary');
            $timerDisplay.classList.remove('text-danger', 'text-warning');
        }
    }

    // ── Utils ──
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Expose removePlayer globally for inline onclick
    window.removePlayer = function (teamName) {
        socket.emit(EVENTS.ADMIN_REMOVE_PLAYER, { teamName });
    };

    // ── Boot ──
    document.addEventListener('DOMContentLoaded', init);
})();
