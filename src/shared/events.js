// Shared Socket.IO event name constants
// Used by both server, admin, and player to avoid typos

module.exports = {
  // Admin → Server
  ADMIN_OPEN_BUZZER: 'admin:openBuzzer',
  ADMIN_CLOSE_BUZZER: 'admin:closeBuzzer',
  ADMIN_RESET_ROUND: 'admin:resetRound',
  ADMIN_NEXT_ROUND: 'admin:nextRound',
  ADMIN_REMOVE_PLAYER: 'admin:removePlayer',
  ADMIN_LOCK_JOINS: 'admin:lockJoins',
  ADMIN_CLEAR_PLAYERS: 'admin:clearPlayers',

  // Player → Server
  PLAYER_JOIN: 'player:join',
  PLAYER_BUZZ: 'player:buzz',

  // Server → Admin
  SERVER_PLAYER_JOINED: 'server:playerJoined',
  SERVER_PLAYER_LEFT: 'server:playerLeft',
  SERVER_BUZZ_RECEIVED: 'server:buzzReceived',
  SERVER_ROUND_STATE: 'server:roundState',
  SERVER_PLAYER_LIST: 'server:playerList',

  // Server → Player
  SERVER_JOIN_RESULT: 'server:joinResult',
  SERVER_BUZZ_RANK: 'server:buzzRank',

  // Round states
  ROUND_IDLE: 'IDLE',
  ROUND_OPEN: 'OPEN',
  ROUND_CLOSED: 'CLOSED',
};
