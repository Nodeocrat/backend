const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const OrderedHash = require(UTILS + '/OrderedHash.js');



module.exports = function(app, io){

  // {username, picUrl}
  const lobbyPlayers = new OrderedHash();
  const NodeShooterInstance = require(API_ROOT + '/shooty-balls/shooty-balls-app.js')(io);

  const joinLobby = function(socket, user){
    lobbyPlayers.insert(user.username, user);
    socket.emit(EventTypes.INIT_LOBBY, lobbyPlayers.toJSON());
    io.emit(EventTypes.PLAYERS_JOINED, [user]);
  };

  app.post('/socialapp/joingame', function(req, res){
    //if(!req.body)
      //res.status(500).end();

    //TODO Validation checks that we are allowed to join game
    res.json({result: 'success'});
  });

  io.on('connection', function(socket){
		const userId = socket.id;
    const user = socket.request.user || null;
    if(!user)
      return;

		const addr = socket.request.connection.remoteAddress;
    const username = user.username;
		console.log(`[INFO] ${username} opened new websocket session from ${addr}.`);

    const basicUser = {username: username, picUrl: user.displayPicture.value, status: 'online'};
    joinLobby(socket, basicUser);

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

    socket.on(EventTypes.JOIN_GAME, info => {
      // GameList.get(info.id).join(socket);

      // Run some validation checks
      socket.emit(EventTypes.JOIN_GAME_SUCCESS, {msg: "Hello from server"});
    });

    socket.on(EventTypes.INIT_FINISH, () => {
      NodeShooterInstance.join({socket, username});
    });

    socket.on(EventTypes.LEAVE_GAME, () => {
      NodeShooterInstance.leave({socket, username});
      joinLobby(socket, basicUser);
    });

    socket.on(EventTypes.DISCONNECT, () => {
      lobbyPlayers.remove(username);

      console.log(`[INFO] ${username} disconnected.`);
      io.emit(EventTypes.PLAYERS_LEFT, [username]);
    });
  });
}
