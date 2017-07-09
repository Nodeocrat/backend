const Room = require('../utils/Room.js');
const EventTypes = require('../event-types.js');
const UTILS = require('../../config').UTILS;
const NodeShooter = require('../NodeShooter');

module.exports = class Lobby extends Room {
  constructor(io, ops, serverPlayers, gameList){
    super(io, ops);

    this._serverPlayers = serverPlayers;
    this._gameList = new Map();

    this.setupGame({name: "Test Game", author: "Server"});
  }

  getGame(id){
    return this._gameList.get(id);
  }

  //Lobby needs to communicate with other rooms
  emit(event, ...args){
    this._emit(event, ...args);
  }

  // For now, the only game is nodeShooter, so no 'type' field
  setupGame(options = {}){
    const nodeShooterInstance  = new NodeShooter(this._io, options);
    nodeShooterInstance.onPlayerLeave((player, updatedGameStats) => {
      this._emit(EventTypes.UPDATE_GAME, updatedGameStats);
    });
    nodeShooterInstance.onPlayerJoin((player, updatedGameStats) => {
      this._emit(EventTypes.PLAYER_JOINED_GAME, player.publicProfile, updatedGameStats);
    });
    this._gameList.set(nodeShooterInstance.roomId, nodeShooterInstance);
    return nodeShooterInstance;
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

    this._addListener(player, EventTypes.CREATE_GAME, res => {

      //TODO: validation
      console.log(`Creating game ${res.options.name || "Untitled"} by ${player.username}`);
      const newGame = this.setupGame(res.options);
      this._emit(EventTypes.ADD_GAME, newGame.stats);
    });

    const gameListData = [];
    for(let [id, game] of this._gameList)
      gameListData.push([id, game.stats]);
    const playerData = [];
    for(let [username, player] of this._serverPlayers)
      playerData.push([username, player.publicProfile]);

    //console.log(`gameListData: ${JSON.stringify(gameListData)}\nplayerData: ${JSON.stringify(playerData)}`);
    player.socket.emit(`${this.roomId}START`,
      {gameList: gameListData, players: playerData});
    super._initPlayer(player);
  }
}
