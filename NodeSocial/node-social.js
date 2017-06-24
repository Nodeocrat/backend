const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const OrderedHash = require(UTILS + '/OrderedHash.js');

module.exports = function(app, io){

  // {username, picUrl}
  const lobbyPlayers = new OrderedHash();

  io.on('connection', function(socket){
		const userId = socket.id;
    const user = socket.request.user || null;
    if(!user)
      return;

		const addr = socket.request.connection.remoteAddress;
    const username = user.username;
		console.log(`[INFO] ${username} opened new websocket session from ${addr}.`);

    const basicUser = {username: username, picUrl: user.displayPicture.value, status: 'online'};
    lobbyPlayers.insert(username, basicUser);
    socket.emit(EventTypes.INIT_LOBBY, lobbyPlayers.toJSON());
    io.emit(EventTypes.PLAYERS_JOINED, [basicUser]);

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
      console.log('in JOIN_GAME');
      // GameList.get(info.id).join(socket);
      socket.emit(EventTypes.INIT_GAME, {msg: "Hello from server"});
    });

    socket.on(EventTypes.DISCONNECT, () => {
      lobbyPlayers.remove(username);

      console.log(`[INFO] ${username} disconnected.`);
      io.emit(EventTypes.PLAYERS_LEFT, [username]);
    });
  });
}
