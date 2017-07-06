const UTILS = require('../../config.js').UTILS;
const randomStr = require(UTILS + '/random-string.js');
const EventTypes = require('../event-types.js');

/* Overridable:
----------------
_onPlayerAccepted
_onPlayerLeave
_initPlayer
_canJoin
*/

module.exports = class Room {
  constructor(io, ops = {}){
    this._io = io;
    this._players = new Map();
    this._roomId = ops.roomId || randomStr();

    //bindings
    this.join = this.join.bind(this);
    this.leave = this.leave.bind(this);
    this._emit = this._emit.bind(this);
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

  join(player){
    const result = this._canJoin(player);
    if(result.success){
      this._onPlayerAccepted(player);
    }
    return result;
  }

  leave(player){
    if(!this.hasPlayer(player))
      return console.log('room.js leave() error: Player not found');

    this._onPlayerLeave(player);
  }

  //Optional override in subclass. If overidden, must call super.
  _onPlayerAccepted(player){
    this.players.set(player.username, {player, listeners: new Map()});
    this._addListener(player, 'CLIENT_INITIALIZED', () => {
      this._initPlayer(player);
    });
    this._addListener(player, 'EXIT', () => this.leave(player));
    player.addRoom(this);
  };

  //Optional override in subclass. If overidden, must call super.
  _onPlayerLeave(player){
    console.log(`player ${player.username} leaving`);
    const listeners = this.players.get(player.username).listeners;
    for(let [event, listener] of listeners)
      player.socket.removeListener(event, listener);
    this.players.delete(player.username);
    player.removeRoom(this);
    player.socket.leave(this.roomId);
  }

  /* Optional override in subclass. If overidden, must call super.
     When initPlayer is called, the following assumptions can be made:
     1. The client has been successfully *allowed* to join the room
     2. The client is ready and initialized (listeners etc)
  */
  _initPlayer(player){
    player.socket.join(this.roomId);
    this._emit(EventTypes.PLAYER_JOINED, player.publicProfile);
  }

  //Optional override in subclass. Do not call super.
  _canJoin(player){return {success: true};}

  _emit(event, ...args){
    console.log(`emitting ${this.roomId}${event}`);
    this._io.to(this.roomId).emit(`${this.roomId}${event}`, ...args);
  }

  _addListener(player, event, listener){
    if(!this.hasPlayer(player))
      return console.log('room.js addListener error: Player not found');

    console.log(`registering listener ${this.roomId}${event}`);
    this.players.get(player.username).listeners.set(`${this.roomId}${event}`, listener);
    player.socket.on(`${this.roomId}${event}`, listener);
  }
}
