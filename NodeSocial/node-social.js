const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;

module.exports = function(app, io){

  io.on('connection', function(socket){
		const userId = socket.id;
    const user = socket.request.user;
    /*{"_id":"5935f387133c0278395c6735",
       "password":"",
       "email":"zukias@gmail.com",
       "username":"狂猫",
       "oauth": {
         "google": {
           "name":"狂猫 ",
           "photoUrl":"https://lh3.googleusercontent.com/-REe7RRHpKz4/AAAAAAAAAAI/AAAAAAAAAUg/OAP7jbRCW_E/s96-c/photo.jpg","id":"116424390509412279867"}},"displayPicture":{"category":"google","value":"https://lh3.googleusercontent.com/-REe7RRHpKz4/AAAAAAAAAAI/AAAAAAAAAUg/OAP7jbRCW_E/s96-c/photo.jpg"
          }
        }
      }*/

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
      console.log(`about to send back msg: ${JSON.stringify(message)}`)
      io.emit(EventTypes.CHAT_MESSAGE_RECEIVED, message);
    });

    socket.on(EventTypes.DISCONNECT, () => {

    });
  });
}
