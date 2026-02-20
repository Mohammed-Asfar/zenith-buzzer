// Session & Round state machine
const {
    ROUND_IDLE,
    ROUND_OPEN,
    ROUND_CLOSED,
} = require('../shared/events');

class Session {
    constructor() {
        this.roundNumber = 1;
        this.roundState = ROUND_IDLE;
        this.buzzes = [];          // Ordered array of { teamName, timestamp, rank }
        this.rounds = [];          // History: [{ roundNumber, buzzes }]
        this.players = new Map();  // Map<socketId, { teamName, joinOrder, buzzed, online }>
        this.joinLocked = false;
        this.joinCounter = 0;
    }

    // ── Player Management ──

    addPlayer(socketId, teamName) {
        if (this.joinLocked) {
            return { success: false, error: 'Joining is currently locked.' };
        }

        // Validate team name
        const trimmed = (teamName || '').trim();
        if (!trimmed) {
            return { success: false, error: 'Team name is required.' };
        }
        if (trimmed.length > 30) {
            return { success: false, error: 'Team name must be 30 characters or less.' };
        }

        // Check uniqueness
        for (const [, player] of this.players) {
            if (player.teamName.toLowerCase() === trimmed.toLowerCase()) {
                return { success: false, error: 'Team name already taken.' };
            }
        }

        this.joinCounter++;
        this.players.set(socketId, {
            teamName: trimmed,
            joinOrder: this.joinCounter,
            buzzed: false,
            online: true,
        });

        return { success: true, teamName: trimmed, joinOrder: this.joinCounter };
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
            return player;
        }
        return null;
    }

    removePlayerByName(teamName) {
        for (const [socketId, player] of this.players) {
            if (player.teamName === teamName) {
                this.players.delete(socketId);
                return { socketId, player };
            }
        }
        return null;
    }

    setPlayerOffline(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            player.online = false;
            return player;
        }
        return null;
    }

    getPlayerList() {
        const list = [];
        for (const [socketId, player] of this.players) {
            list.push({ socketId, ...player });
        }
        return list.sort((a, b) => a.joinOrder - b.joinOrder);
    }

    clearPlayers() {
        this.players.clear();
        this.joinCounter = 0;
    }

    setJoinLocked(locked) {
        this.joinLocked = locked;
    }

    // ── Round Management ──

    openBuzzer() {
        if (this.roundState !== ROUND_IDLE) return false;
        this.roundState = ROUND_OPEN;
        this.buzzes = [];
        // Reset buzzed flag for all players
        for (const [, player] of this.players) {
            player.buzzed = false;
        }
        return true;
    }

    closeBuzzer() {
        if (this.roundState !== ROUND_OPEN) return false;
        this.roundState = ROUND_CLOSED;
        return true;
    }

    resetRound() {
        this.roundState = ROUND_IDLE;
        this.buzzes = [];
        for (const [, player] of this.players) {
            player.buzzed = false;
        }
        return true;
    }

    nextRound() {
        // Archive current round
        this.rounds.push({
            roundNumber: this.roundNumber,
            buzzes: [...this.buzzes],
        });
        this.roundNumber++;
        this.roundState = ROUND_IDLE;
        this.buzzes = [];
        for (const [, player] of this.players) {
            player.buzzed = false;
        }
        return this.roundNumber;
    }

    // ── Buzz Handling ──

    recordBuzz(socketId) {
        if (this.roundState !== ROUND_OPEN) {
            return { success: false, error: 'Buzzer is not open.' };
        }

        const player = this.players.get(socketId);
        if (!player) {
            return { success: false, error: 'Player not found.' };
        }

        if (player.buzzed) {
            return { success: false, error: 'Already buzzed.' };
        }

        player.buzzed = true;
        const rank = this.buzzes.length + 1;
        const timestamp = process.hrtime.bigint();

        const buzz = {
            teamName: player.teamName,
            timestamp: timestamp.toString(),
            rank: rank,
        };

        this.buzzes.push(buzz);
        return { success: true, ...buzz };
    }

    // ── State Getters ──

    getRoundState() {
        return {
            roundNumber: this.roundNumber,
            state: this.roundState,
            buzzes: this.buzzes,
        };
    }

    getSessionData() {
        return {
            rounds: [
                ...this.rounds,
                {
                    roundNumber: this.roundNumber,
                    buzzes: [...this.buzzes],
                },
            ],
        };
    }
}

module.exports = Session;
