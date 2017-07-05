const UTILS = require('../../config.js').UTILS;
const randomStr = require(UTILS + '/random-string.js');
const EventTypes = require('../event-types.js');

module.exports = class Room {
  constructor(io, ops = {}){
    this._io = io;
    this._players = new Map();
    this._roomId = ops.roomId || randomStr();

    //bindings
    this.join = this.join.bind(this);
    this.leave = this.leave.bind(this);
    this.emit = this.emit.bind(this);
  }

  get roomId(){
    return this._roomId;
  }

  get players(){
    return this._players;
  }

  hasPlayer(player){
    let playerInfo = null;
    if(player !== null && typeof player === 'object')
      playerInfo = this.players.get(player.username);
    else //assume username string
      playerInfo = this.players.get(player);

    if(!playerInfo)
      return false;
    else
      return true;

  }

  emit(event, ...args){
    console.log(`emitting ${this.roomId}${event}`);
    this._io.to(this.roomId).emit(`${this.roomId}${event}`, ...args);
  }

  join(player){
    const result = this.canJoin(player);
    if(result.success){
      this.players.set(player.username, {player, listeners: new Map()});
      this._addListener(player, 'CLIENT_INITIALIZED', () => {
        this._initPlayer(player);
      });
      this._addListener(player, 'EXIT', () => {
        console.log(`${player.username} leaving lobby`);
        this.leave(player);
      });
      player.addRoom(this);
    }
    return result;
  }

  /*Override*/
  canJoin(player){return {success: true};}

  leave(player){
    if(!this.hasPlayer(player))
      return console.log('room.js leave() error: Player not found');

    console.log(`player ${player.username} leaving`);
    const listeners = this.players.get(player.username).listeners;
    for(let [event, listener] of listeners)
      player.socket.removeListener(event, listener);
    this.players.delete(player.username);
    player.removeRoom(this);
    player.socket.leave(this.roomId);
    this.emit(EventTypes.PLAYERS_LEFT, player.username);
  }

  _addListener(player, event, listener){
    if(!this.hasPlayer(player))
      return console.log('room.js addListener error: Player not found');

    console.log(`registering listener ${this.roomId}${event}`);
    this.players.get(player.username).listeners.set(`${this.roomId}${event}`, listener);
    player.socket.on(`${this.roomId}${event}`, listener);
  }

  /* When initPlayer is called, the following assumptions can be made:
     1. The client has been successfully *allowed* to join the room
     2. The client is ready and initialized (listeners etc)
  */
  _initPlayer(player){/*implement in sub class*/
    player.socket.join(this.roomId);
    this.emit(EventTypes.PLAYERS_JOINED, [player.publicProfile]);
  }
}
