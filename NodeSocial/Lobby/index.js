const Room = require('../utils/Room.js');
const EventTypes = require('../event-types.js');
const UTILS = require('../../config').UTILS;

module.exports = class Lobby extends Room {
  constructor(io, ops, serverPlayers, gameList){
    super(io, ops);

    this._serverPlayers = serverPlayers;
    this._gameList = gameList;
  }

  //Lobby needs to communicate with other rooms
  emit(event, ...args){
    this._emit(event, ...args);
  }

  _initPlayer(player){
    this._addListener(player, EventTypes.SEND_MESSAGE, msg => {
      const randomStr = require(UTILS + '/random-string.js')();

      const message = {
        timestamp: "",  //TODO to be implemented
        group: "", //TODO to be implemented
        username: player.username,
        id: `${player.username}|${randomStr}`,
        text: msg
      };
      this._emit(EventTypes.CHAT_MESSAGE_RECEIVED, message);
    });

    const gameListData = [];
    for(let [id, game] of this._gameList)
      gameListData.push([id, game.stats]);
    const playerData = [];
    for(let [username, player] of this._serverPlayers)
      playerData.push([username, player.publicProfile]);

    console.log(`gameListData: ${JSON.stringify(gameListData)}\nplayerData: ${JSON.stringify(playerData)}`);
    player.socket.emit(`${this.roomId}START`,
      {gameList: gameListData, players: playerData});
    super._initPlayer(player);
  }
}
