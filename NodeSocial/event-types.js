module.exports = {
  //Emitted by server
  CHAT_MESSAGE_RECEIVED: 'CHAT_MESSAGE_RECEIVED',
  PLAYER_JOINED: 'PLAYERS_JOINED',
  PLAYER_LEFT: 'PLAYERS_LEFT',
  JOIN_GAME_SUCCESS: 'JOIN_GAME_SUCCESS',
  JOIN_GAME_ERROR: 'JOIN_GAME_ERROR',
  PLAYER_JOINED_GAME: 'PLAYER_JOINED_GAME',
  PLAYER_LEFT_GAME: 'PLAYER_LEFT_GAME',
  UPDATE_GAME: 'UPDATE_GAME',
  ADD_GAME: 'ADD_GAME',
  GAME_ENDED: 'GAME_ENDED',

  //Fired by user
  JOIN_GAME: 'JOIN_GAME',
  CLIENT_INITIALIZED: 'CLIENT_INITIALIZED',
  CREATE_GAME: 'CREATE_GAME',
  SEND_MESSAGE: 'SEND_MESSAGE',
  EXIT: 'EXIT',
  DISCONNECT: 'disconnect',
  CONNECT: 'CONNECT'
};
