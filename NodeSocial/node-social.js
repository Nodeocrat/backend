const Lobby = require('./Lobby');
const Room = require('server-room');

const SID = 'connect.sid';
const IP_HEADER = 'x-real-ip';

module.exports = function(app, server){

  const lobby = new Lobby();

  app.post('/socialapp/joingame/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    if(!gameId)
      return res.json({success:false, error:{message:'Game not found!'}});

    const gameInstance = lobby.getGame(gameId);
    if(!gameInstance)
      return res.json({success:false, error:{message:'player or game instance not found'}});

    const sid = req.cookies[SID];
    const user = req.user;
    const ip = req.headers[IP_HEADER];
    if(!user)
      return req.status(401).end(); //Unauthorized

    const username = user.username;
    console.log(`${username} (${ip}) requested to join game`);
    const result = gameInstance.join({sid, ip, id: username});
    result.url = '/api/';
    return res.json(result);
  });

  app.post('/socialapp/lobby/join', (req, res) => {
    const sid = req.cookies[SID];
    const user = req.user;
    const ip = req.headers[IP_HEADER];
    if(!user)
      return res.status(401).end(); //Unauthorized

    const username = user.username;
    const picUrl = user.displayPicture.value;
    console.log(`${username} (${ip}) requested to join lobby`);
    console.log(`sid: ${sid}`);
    const result = lobby.join({sid, picUrl, ip, id: username});
    result.url = '/api/';
    return res.json(result);
  });

  /*Websocket server*/
  //TODO move this into the client module; it is always going to be here.
  Room.initialize(server, {sidHeader: SID, ipHeader: IP_HEADER});
}
