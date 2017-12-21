const Room = require('server-room');
const EventTypes = require('../event-types.js');
const UTILS = require('../../config').UTILS;
const LobbyPlayer = require('./lobby-player.js');
const NodeShooter = require('../NodeShooter');

const MAX_GAMES = 3;

module.exports = class Lobby extends Room {
  constructor(){
    super();

    this._lobbyPlayers = new Map();
    this._gameList = new Map();
    this.setupGame({name: "Test Game", author: "Server"});
  }

  onClientAccepted(client, userInfo){
    super.onClientAccepted(client);
    const newLobbyPlayer = new LobbyPlayer({client, picUrl: userInfo.picUrl});
    this._lobbyPlayers.set(client.id, newLobbyPlayer);
  }

  getGame(id){
    return this._gameList.get(id);
  }

  //Overidden to recognise paused players
  broadcast(event, payload){
    for(let [username, player] of this._lobbyPlayers){
      if(player.status === LobbyPlayer.States.ACTIVE)
        this.emit(player.client, event, payload);
    }
  }

  onJoinRequest(userInfo){
    const id = userInfo.id;
    if(!id)
      return {success: false, error: {message: 'ID not defined'}, reason: 'Error occurred'};

    if(this.clients.get(id)){
      if(!this._lobbyPlayers.get(id))
        console.log(`ERROR! User ${id} in clients but not _lobbyPlayers`);
      return {success: false, reason: `User ${id} already in room`};
    }

    return {success: true};
  }

  onClientLeave(client){
    super.onClientLeave(client);
    this._lobbyPlayers.delete(client.id);
    this.broadcast(EventTypes.PLAYER_LEFT, client.username);
  }

  onClientDisconnect(client){
    super.onClientDisconnect(client);
    this._lobbyPlayers.delete(client.id);
    this.broadcast(EventTypes.PLAYER_LEFT, client.username);
    //TODO broadcast disconnect event instead once we have a proper leave method
  }

  setupGame(options = {}){
    const nodeShooterInstance  = new NodeShooter(options);
    nodeShooterInstance.onPlayerLeave((client, updatedGameStats) => {
      const player = this._lobbyPlayers.get(client.id);
      if(player){
        player.status = LobbyPlayer.States.ACTIVE;
        this.broadcast(EventTypes.UPDATE_PLAYER, player.publicProfile);
        this.broadcast(EventTypes.UPDATE_GAME, updatedGameStats);
      } else {
        console.log(`Error: tried to remove client ${client.id} from lobby, but not found`);
      }
    });
    nodeShooterInstance.onPlayerJoin((client, updatedGameStats) => {
      const player = this._lobbyPlayers.get(client.id);
      player.status = LobbyPlayer.States.IN_GAME;
      this.broadcast(EventTypes.PLAYER_JOINED_GAME, {player:player.publicProfile, game:updatedGameStats});
    });
    nodeShooterInstance.onEnd(() => {
      //TODO
    });
    this._gameList.set(nodeShooterInstance.id, nodeShooterInstance);
    return nodeShooterInstance;
  }

  initClient(client){
    super.initClient(client);

    const player = this._lobbyPlayers.get(client.id);
    this.addListener(client, EventTypes.SEND_MESSAGE, msg => {
      const randomStr = require(UTILS + '/random-string.js')();

      const message = {
        timestamp: "",  //TODO to be implemented
        group: "", //TODO to be implemented
        username: player.username,
        id: `${player.username}|${randomStr}`,
        text: msg
      };
      this.broadcast(EventTypes.CHAT_MESSAGE_RECEIVED, message);
    });

    this.addListener(client, EventTypes.CREATE_GAME, options => {

      //validation
      if(this._gameList.size >= MAX_GAMES)
        return res({error: "Cannot create anymore games. Server limit reached."});

      console.log(`Creating game ${(options && options.name) || "Untitled"} by ${client.username}`);
      if (options){ // Set server options
        data.options.author = player.username;
        data.options.timer = 300;
      }

      const newGame = this.setupGame(options);
      this.broadcast(EventTypes.ADD_GAME, newGame.stats);
      //clientCallback({success: true});
    });

    player.status = LobbyPlayer.States.ACTIVE;
    this.broadcast(EventTypes.PLAYER_JOINED, player.profile);

    const gameListData = [];
    for(let [id, game] of this._gameList)
      gameListData.push([id, game.stats]);
    const playerData = [];
    for(let [username, player] of this._lobbyPlayers)
      playerData.push([username, player.profile]);

    //console.log(`gameListData: ${JSON.stringify(gameListData)}\nplayerData: ${JSON.stringify(playerData)}`);
    this.emit(client, 'START', {gameList: gameListData, players: playerData});
  }
}
