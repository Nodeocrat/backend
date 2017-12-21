const Game = require('../utils/Game.js');
const NodeShooterOld = require(API_ROOT + '/shooty-balls/shooty-balls-app.js');


// Until Node Shooter is re-written, this class will serve as a wrapper for the
// old version just so it can be treated as a 'room'.
module.exports = class NodeShooter extends Game {
  constructor(ops){
    super(ops);
    this._nodeShooterInstance = NodeShooterOld(this);
  }

  initPlayer(client){
    super.initPlayer(client);
    this._nodeShooterInstance.join(client);
  }

  onClientLeave(client){
    super.onClientLeave(client);
    this._nodeShooterInstance.leave(client);
  }
}
