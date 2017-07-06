const Game = require('../utils/Game.js');
const NodeShooterOld = require(API_ROOT + '/shooty-balls/shooty-balls-app.js');


// Until Node Shooter is re-written, this class will serve as a wrapper for the
// old version just so it can be treated as a 'room'.
module.exports = class NodeShooter extends Game {
  constructor(io, ops){
    super(io, ops);
    this._nodeShooterInstance = NodeShooterOld(io, this.roomId);
  }

  _initPlayer(player){
    this._nodeShooterInstance.join(player);
    player.socket.join(this.roomId);
  }

  _onPlayerLeave(player){
    super._onPlayerLeave(player);
    this._nodeShooterInstance.leave(player);
  }
}
