const UTILS = require('../../config.js').UTILS;
const randomStr = require(UTILS + '/random-string.js');
const Room = require('./Room.js');

// Base class for all games
module.exports = class Game extends Room {

  constructor(io, ops){
    super(io, ops);

    let name = "Untitled Game";
    if(ops.name)
      name = ops.name;
    else if (ops.author)
      name = `${ops.author}'s Game`;

    this._name = name;
    this._playerCount = 0;

    //It is only expected for the lobby to need to listen to these events for now
    //hence the decision for only a single allowed listener to prevent accidental memory leak
    this._onPlayerLeaveListener = () => {};
    this._onPlayerJoinListener = () => {};
    this._onEndListener = () => {};

  }

  get name(){
    return this._name;
  }

  get stats(){
    return {
      id: this.roomId,
      name: this.name,
      playerCount: this._playerCount
    };
  }

  get playerCount(){
    return this._playerCount;
  }

  onPlayerLeave(listener){
    this._onPlayerLeaveListener = listener;
  }

  onPlayerJoin(listener){
    this._onPlayerJoinListener = listener;
  }

  onEnd(listener){
    this._onEndListener = listener;
  }

  _onPlayerLeave(player){
    super._onPlayerLeave(player);
    this._playerCount--;
    this._onPlayerLeaveListener(player, this.stats);
  }

  _initPlayer(player){
    super._initPlayer(player);
  }

  _onPlayerAccepted(player){
    super._onPlayerAccepted(player);
    this._playerCount++;
    this._onPlayerJoinListener(player, this.stats);
  }
}
