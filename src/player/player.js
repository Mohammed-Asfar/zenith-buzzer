// Player interface — Socket.IO client + UI logic
(function () {
    'use strict';

    // ── Event Constants ──
    const EVENTS = {
        PLAYER_JOIN: 'player:join',
        PLAYER_BUZZ: 'player:buzz',
        SERVER_JOIN_RESULT: 'server:joinResult',
        SERVER_ROUND_STATE: 'server:roundState',
        SERVER_BUZZ_RANK: 'server:buzzRank',
        ROUND_IDLE: 'IDLE',
        ROUND_OPEN: 'OPEN',
        ROUND_CLOSED: 'CLOSED',
    };

    let socket;
    let teamName = '';
    let hasBuzzed = false;

    // ── DOM References ──
    const $joinScreen = document.getElementById('join-screen');
    const $buzzerScreen = document.getElementById('buzzer-screen');
    const $teamInput = document.getElementById('team-name-input');
    const $btnJoin = document.getElementById('btn-join');
    const $joinError = document.getElementById('join-error');
    const $teamLabel = document.getElementById('team-label');
    const $statusMsg = document.getElementById('status-msg');
    const $btnBuzz = document.getElementById('btn-buzz');
    const $rankDisplay = document.getElementById('rank-display');
    const $rankIcon = document.getElementById('rank-icon');
    const $rankText = document.getElementById('rank-text');

    // ── Connect to server ──
    function connect() {
        socket = io('/player');

        socket.on('connect', () => {
            console.log('[Player] Connected:', socket.id);
        });

        socket.on(EVENTS.SERVER_ROUND_STATE, (data) => {
            updateBuzzerState(data.state);
        });

        socket.on(EVENTS.SERVER_BUZZ_RANK, (data) => {
            showRank(data.rank);
        });

        socket.on('server:kicked', () => {
            alert('You have been removed by the admin.');
            location.reload();
        });

        socket.on('disconnect', () => {
            $statusMsg.innerHTML = '<p class="text-danger text-lg font-semibold">Disconnected — trying to reconnect...</p>';
        });

        socket.on('reconnect', () => {
            $statusMsg.innerHTML = '<p class="text-success text-lg">Reconnected!</p>';
        });
    }

    // ── Join Flow ──
    function doJoin() {
        const name = $teamInput.value.trim();
        if (!name) {
            showError('Please enter a team name.');
            return;
        }
        if (name.length > 30) {
            showError('Team name must be 30 characters or less.');
            return;
        }

        $btnJoin.disabled = true;
        $btnJoin.textContent = 'Joining...';

        socket.emit(EVENTS.PLAYER_JOIN, { teamName: name }, (result) => {
            if (result.success) {
                teamName = result.teamName;
                $teamLabel.textContent = teamName;
                $joinScreen.classList.add('hidden');
                $buzzerScreen.classList.remove('hidden');
            } else {
                showError(result.error || 'Could not join. Try again.');
                $btnJoin.disabled = false;
                $btnJoin.textContent = 'Join Game';
            }
        });
    }

    function showError(msg) {
        $joinError.textContent = msg;
        $joinError.classList.remove('hidden');
        // Shake animation
        $teamInput.classList.add('ring-2', 'ring-danger');
        setTimeout(() => {
            $teamInput.classList.remove('ring-2', 'ring-danger');
        }, 1500);
    }

    // ── Buzzer State ──
    function updateBuzzerState(state) {
        if (state === EVENTS.ROUND_OPEN && !hasBuzzed) {
            $btnBuzz.disabled = false;
            $btnBuzz.classList.add('animate-buzzer-pulse');
            $statusMsg.innerHTML = '<p class="text-success text-xl font-bold animate-pulse">🔔 BUZZ NOW!</p>';
            // Vibrate on mobile if available
            if (navigator.vibrate) navigator.vibrate(200);
        } else if (state === EVENTS.ROUND_CLOSED) {
            $btnBuzz.disabled = true;
            $btnBuzz.classList.remove('animate-buzzer-pulse');
            if (!hasBuzzed) {
                $statusMsg.innerHTML = '<p class="text-danger text-lg font-semibold">Round closed</p>';
            }
        } else if (state === EVENTS.ROUND_IDLE) {
            $btnBuzz.disabled = true;
            $btnBuzz.classList.remove('animate-buzzer-pulse');
            hasBuzzed = false;
            $rankDisplay.classList.add('hidden');
            $statusMsg.innerHTML = '<p class="text-text-muted text-lg">Waiting for round to start...</p>';
        }
    }

    function doBuzz() {
        if (hasBuzzed) return;
        hasBuzzed = true;
        $btnBuzz.disabled = true;
        $btnBuzz.classList.remove('animate-buzzer-pulse');
        $btnBuzz.classList.add('animate-buzzer-press');
        $statusMsg.innerHTML = '<p class="text-accent text-lg font-semibold">Buzzed! Waiting for rank...</p>';

        socket.emit(EVENTS.PLAYER_BUZZ);

        // Vibrate feedback
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    function showRank(rank) {
        $rankDisplay.classList.remove('hidden');
        $rankDisplay.querySelector('div').classList.remove('animate-rank-pop');
        // Trigger reflow
        void $rankDisplay.offsetWidth;
        $rankDisplay.querySelector('div').classList.add('animate-rank-pop');

        if (rank === 1) {
            $rankIcon.textContent = '🥇';
            $rankText.textContent = '1st Place!';
            $rankText.className = 'text-3xl font-bold text-rank-gold';
        } else if (rank === 2) {
            $rankIcon.textContent = '🥈';
            $rankText.textContent = '2nd Place';
            $rankText.className = 'text-2xl font-bold text-text-secondary';
        } else if (rank === 3) {
            $rankIcon.textContent = '🥉';
            $rankText.textContent = '3rd Place';
            $rankText.className = 'text-2xl font-bold text-warning';
        } else {
            $rankIcon.textContent = '🏁';
            $rankText.textContent = `#${rank}`;
            $rankText.className = 'text-2xl font-bold text-text-primary';
        }

        $statusMsg.innerHTML = `<p class="text-accent text-lg font-semibold">You buzzed!</p>`;
    }

    // ── Event Listeners ──
    $btnJoin.addEventListener('click', doJoin);
    $teamInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doJoin();
    });
    $btnBuzz.addEventListener('click', doBuzz);

    // ── Boot ──
    connect();
})();
