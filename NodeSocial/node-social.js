const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const OrderedHash = require(UTILS + '/OrderedHash.js');



module.exports = function(app, io){

  // {username, picUrl}
  const lobbyPlayers = new OrderedHash();
  const gameList = new OrderedHash({init: {'testgame': {name: "Test Game", id: "testgame", players: 0}}});
  const NodeShooterInstance = require(API_ROOT + '/shooty-balls/shooty-balls-app.js')(io, {name: "Test Game"});
  NodeShooterInstance.onPlayersLeave(usernames => {
    const gameLeft = gameList.get('testgame');
    gameLeft.players--;
    io.emit(EventTypes.UPDATE_GAME, gameLeft);
  });

  const clientUserFormat = user => ({username: user.username, picUrl: user.displayPicture.value, status: 'ONLINE'});

  app.post('/socialapp/joingame', (req, res) => {
    //if(!req.body)
      //res.status(500).end();

    //TODO Validation checks that we are allowed to join game
    const gameJoined = gameList.get('testgame');
    gameJoined.players++;
    res.json({result: 'success'});
    const player = lobbyPlayers.get(req.user.username);
    player.status = 'IN_GAME';
    console.log(`Player joined: ${JSON.stringify(player)}`);
    io.emit(EventTypes.PLAYER_JOINED_GAME, [player], gameJoined);
  });

  app.post('/socialapp/lobby/join', (req, res) => {
    const clientUser = clientUserFormat(req.user);
    lobbyPlayers.insert(clientUser.username, clientUser);
    res.json({result: 'success', gameList: gameList.toJSON(), players: lobbyPlayers.toJSON()});
    io.emit(EventTypes.PLAYERS_JOINED, [clientUser]);
  });

  io.on('connection', function(socket){
		const userId = socket.id;
    const user = socket.request.user || null;
    if(!user)
      return;

		const addr = socket.request.connection.remoteAddress;
    const username = user.username;
		console.log(`[INFO] ${username} opened new websocket session from ${addr}.`);

		// TODO make sure that username not already in use
		socket.on(EventTypes.SEND_MESSAGE, msg => {
      const matchId = msg.matchId || 0000;
      const randomStr = require(UTILS + '/random-string.js')();

      const message = {
        timestamp: "",  //TODO to be implemented
        group: "", //TODO to be implemented
        username: username,
        id: `${username}|${matchId}|${randomStr}`,
        text: msg.text
      };
      io.emit(EventTypes.CHAT_MESSAGE_RECEIVED, message);
    });

    socket.on(EventTypes.INIT_FINISH, () => {
      NodeShooterInstance.join({socket, username});
    });

    socket.on(EventTypes.LEAVE_GAME, () => {
      NodeShooterInstance.leave({socket, username});
    });

    socket.on(EventTypes.DISCONNECT, () => {
      lobbyPlayers.remove(username);
      console.log(`[INFO] ${username} left the lobby.`);
      io.emit(EventTypes.PLAYERS_LEFT, [username]);
    });
  });
}
