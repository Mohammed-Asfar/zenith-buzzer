// Express + Socket.IO server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Session = require('./session');
const EVENTS = require('../shared/events');

/**
 * Create and start the local server
 * @param {number} port - Port to listen on
 * @returns {{ app, server, io, session }}
 */
function createServer(port = 3000) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: '*' },
    });
    const session = new Session();

    // ── Static files ──
    // Serve player pages
    app.use(express.static(path.join(__dirname, '..', 'player')));

    // Serve socket.io-client bundle so players can connect offline
    app.use(
        '/socket.io-client',
        express.static(
            path.join(__dirname, '..', '..', 'node_modules', 'socket.io-client', 'dist')
        )
    );

    // ── Socket.IO ──

    // Admin namespace
    const adminNsp = io.of('/admin');
    adminNsp.on('connection', (socket) => {
        console.log('[Admin] Connected:', socket.id);

        // Send current state on connect
        socket.emit(EVENTS.SERVER_ROUND_STATE, session.getRoundState());
        socket.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());

        // Round controls
        socket.on(EVENTS.ADMIN_OPEN_BUZZER, () => {
            if (session.openBuzzer()) {
                io.of('/player').emit(EVENTS.SERVER_ROUND_STATE, { state: EVENTS.ROUND_OPEN });
                adminNsp.emit(EVENTS.SERVER_ROUND_STATE, session.getRoundState());
            }
        });

        socket.on(EVENTS.ADMIN_CLOSE_BUZZER, () => {
            if (session.closeBuzzer()) {
                io.of('/player').emit(EVENTS.SERVER_ROUND_STATE, { state: EVENTS.ROUND_CLOSED });
                adminNsp.emit(EVENTS.SERVER_ROUND_STATE, session.getRoundState());
            }
        });

        socket.on(EVENTS.ADMIN_RESET_ROUND, () => {
            if (session.resetRound()) {
                io.of('/player').emit(EVENTS.SERVER_ROUND_STATE, { state: EVENTS.ROUND_IDLE });
                adminNsp.emit(EVENTS.SERVER_ROUND_STATE, session.getRoundState());
                adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
            }
        });

        socket.on(EVENTS.ADMIN_NEXT_ROUND, () => {
            const newRound = session.nextRound();
            io.of('/player').emit(EVENTS.SERVER_ROUND_STATE, { state: EVENTS.ROUND_IDLE, roundNumber: newRound });
            adminNsp.emit(EVENTS.SERVER_ROUND_STATE, session.getRoundState());
            adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
        });

        // Player management
        socket.on(EVENTS.ADMIN_REMOVE_PLAYER, ({ teamName }) => {
            const removed = session.removePlayerByName(teamName);
            if (removed) {
                // Disconnect the player's socket
                const playerSocket = io.of('/player').sockets.get(removed.socketId);
                if (playerSocket) {
                    playerSocket.emit('server:kicked');
                    playerSocket.disconnect(true);
                }
                adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
            }
        });

        socket.on(EVENTS.ADMIN_LOCK_JOINS, ({ locked }) => {
            session.setJoinLocked(locked);
        });

        socket.on(EVENTS.ADMIN_CLEAR_PLAYERS, () => {
            // Disconnect all player sockets
            io.of('/player').disconnectSockets(true);
            session.clearPlayers();
            adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
        });

        // Export
        socket.on('admin:getSessionData', (callback) => {
            if (typeof callback === 'function') {
                callback(session.getSessionData());
            }
        });
    });

    // Player namespace
    const playerNsp = io.of('/player');
    playerNsp.on('connection', (socket) => {
        console.log('[Player] Connected:', socket.id);

        // Send current round state
        socket.emit(EVENTS.SERVER_ROUND_STATE, { state: session.roundState, roundNumber: session.roundNumber });

        // Join
        socket.on(EVENTS.PLAYER_JOIN, ({ teamName }, callback) => {
            const result = session.addPlayer(socket.id, teamName);
            if (typeof callback === 'function') {
                callback(result);
            }
            if (result.success) {
                adminNsp.emit(EVENTS.SERVER_PLAYER_JOINED, {
                    teamName: result.teamName,
                    joinOrder: result.joinOrder,
                });
                adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
            }
        });

        // Buzz
        socket.on(EVENTS.PLAYER_BUZZ, () => {
            const result = session.recordBuzz(socket.id);
            if (result.success) {
                // Tell the player their rank
                socket.emit(EVENTS.SERVER_BUZZ_RANK, { rank: result.rank });
                // Tell admin about the buzz
                adminNsp.emit(EVENTS.SERVER_BUZZ_RECEIVED, {
                    teamName: result.teamName,
                    rank: result.rank,
                    timestamp: result.timestamp,
                });
                // Send updated round state so rankings refresh in real-time
                adminNsp.emit(EVENTS.SERVER_ROUND_STATE, session.getRoundState());
                // Update player list so BUZZED indicator shows
                adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
            }
        });

        // Disconnect
        socket.on('disconnect', () => {
            const player = session.setPlayerOffline(socket.id);
            if (player) {
                adminNsp.emit(EVENTS.SERVER_PLAYER_LEFT, { teamName: player.teamName });
                adminNsp.emit(EVENTS.SERVER_PLAYER_LIST, session.getPlayerList());
            }
        });
    });

    return { app, server, io, session };
}

/**
 * Start listening on the given port, with fallback
 */
function startServer(serverObj, port = 3000, maxRetries = 10) {
    return new Promise((resolve, reject) => {
        let currentPort = port;
        let retries = 0;

        function tryListen() {
            serverObj.server.listen(currentPort, () => {
                console.log(`[Server] Listening on port ${currentPort}`);
                resolve(currentPort);
            });

            serverObj.server.once('error', (err) => {
                if (err.code === 'EADDRINUSE' && retries < maxRetries) {
                    retries++;
                    currentPort++;
                    console.log(`[Server] Port ${currentPort - 1} in use, trying ${currentPort}...`);
                    tryListen();
                } else {
                    reject(err);
                }
            });
        }

        tryListen();
    });
}

module.exports = { createServer, startServer };
