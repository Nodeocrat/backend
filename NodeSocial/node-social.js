const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const Player = require('./utils/Player.js');
const Lobby = require('./Lobby');
const NodeShooter = require('./NodeShooter');

module.exports = function(app, io){

  const players = new Map();
  const gameList = new Map();
  const lobby = new Lobby(io, {roomId: '!lobby!'}, players, gameList);

  const nodeShooterInstance = new NodeShooter(io, {name: "Test Game", author: "Server"});
  nodeShooterInstance.onPlayerLeave((player, updatedGameStats) => {
    lobby.emit(EventTypes.UPDATE_GAME, updatedGameStats);
  });
  nodeShooterInstance.onPlayerJoin((player, updatedGameStats) => {
    lobby.emit(EventTypes.PLAYER_JOINED_GAME, player.publicProfile, updatedGameStats);
  });
  gameList.set(nodeShooterInstance.roomId, nodeShooterInstance);
  //TODO on players join and onEnd...

  app.post('/socialapp/joingame', (req, res) => {
    if(!req.body || !req.body.id)
      return res.status(500).end();

    const gameInstance = gameList.get(req.body.id);
    const joiningPlayer = players.get(req.user.username);
    if(!joiningPlayer || !gameInstance)
      return;
    if(joiningPlayer.in(lobby))
      lobby.leave(joiningPlayer);
    joiningPlayer.status = 'IN_GAME';
    const result = gameInstance.join(joiningPlayer);
    res.json(result);
  });

  app.post('/socialapp/lobby/join', (req, res) => {
    const joiningPlayer = players.get(req.user.username);
    if(!joiningPlayer)
      return;
    joiningPlayer.status = 'ONLINE';
    const result = lobby.join(joiningPlayer);
    res.json(result);
  });

  io.on('connection', function(socket){
    const user = socket.request.user || null;
    if(!user)
      return;

    const thisPlayer = new Player(user, socket);
    players.set(thisPlayer.username, thisPlayer);

		console.log(`[INFO] ${thisPlayer.username} opened new websocket session from ${thisPlayer.ip}.`);

		// TODO make sure that username not already in use

    socket.on(EventTypes.DISCONNECT, () => {
      thisPlayer.leaveAllRooms();
      lobby.emit(EventTypes.PLAYER_LEFT, thisPlayer.publicProfile);
      players.delete(thisPlayer.username);
      console.log(`[INFO] ${thisPlayer.username} Disconnected.`);
    });
  });
}
