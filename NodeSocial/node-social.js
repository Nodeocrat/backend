const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const Player = require('./utils/Player.js');
const Lobby = require('./Lobby');

module.exports = function(app, io){

  const players = new Map();
  const gameList = new Map([['testgame', {info: {name: "Test Game", id: "testgame", playerCount: 0}}]]);
  const lobby = new Lobby(io, {roomId: '!lobby!'}, players, gameList);


  const NodeShooterInstance = require(API_ROOT + '/shooty-balls/shooty-balls-app.js')(io, {name: "Test Game"});
  NodeShooterInstance.onPlayersLeave(usernames => {
    const gameLeft = gameList.get('testgame');
    if(gameLeft)
      gameLeft.info.players--;
    else
      return;
    lobby.emit(EventTypes.UPDATE_GAME, gameLeft.info);
  });
  //TODO on players join and onEnd...

  app.post('/socialapp/joingame', (req, res) => {
    if(!req.body || !req.body.id)
      return res.status(500).end();

    console.log('joingame post...');
    //TODO Validation checks that we are allowed to join game
    const gameJoined = gameList.get(req.body.id);
    gameJoined.info.players++;
    res.json({success: true});
    const player = players.get(req.user.username);
    player.status = 'IN_GAME';
    if(player.in(lobby))
      lobby.leave(player);
    lobby.emit(EventTypes.PLAYER_JOINED_GAME, [player.publicProfile], gameJoined.info);
  });

  app.post('/socialapp/lobby/join', (req, res) => {
    const joiningPlayer = players.get(req.user.username);
    if(!joiningPlayer)
      return;
    joiningPlayer.status = 'ONLINE';
    const result = lobby.join(joiningPlayer);
    res.json({result});

  });

  io.on('connection', function(socket){
    const user = socket.request.user || null;
    if(!user)
      return;

    const thisPlayer = new Player(user, socket);
    players.set(thisPlayer.username, thisPlayer);

		console.log(`[INFO] ${thisPlayer.username} opened new websocket session from ${thisPlayer.ip}.`);

		// TODO make sure that username not already in use

    socket.on(EventTypes.INIT_FINISH, () => {
      NodeShooterInstance.join({socket, username: thisPlayer.username});
    });

    socket.on(EventTypes.LEAVE_GAME, () => {
      NodeShooterInstance.leave({socket, username: thisPlayer.username});
    });

    socket.on(EventTypes.DISCONNECT, () => {
      thisPlayer.leaveAllRooms();
      players.delete(thisPlayer.username);
      console.log(`[INFO] ${thisPlayer.username} Disconnected.`);
    });
  });
}
