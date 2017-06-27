module.exports = {
  //Emitted by server
  INIT_LOBBY: 'INIT_LOBBY',
  START_GAME: 'START_GAME',
  CHAT_MESSAGE_RECEIVED: 'CHAT_MESSAGE_RECEIVED',
  PLAYERS_JOINED: 'PLAYERS_JOINED',
  PLAYERS_LEFT: 'PLAYERS_LEFT',
  JOIN_GAME_SUCCESS: 'JOIN_GAME_SUCCESS',
  JOIN_GAME_ERROR: 'JOIN_GAME_ERROR',

  //Fired by user
  JOIN_GAME: 'JOIN_GAME',
  INIT_FINISH: 'INIT_FINISH',
  SEND_MESSAGE: 'SEND_MESSAGE',
  LEAVE_GAME: 'LEAVE_GAME',
  DISCONNECT: 'disconnect',
  CONNECT: 'CONNECT'
};