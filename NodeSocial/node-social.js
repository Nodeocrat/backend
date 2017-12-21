const EventTypes = require('./event-types.js');
const config = require('../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const Player = require('./utils/Player.js');
const Lobby = require('./Lobby');
const ClientPool = require('server-room').ClientPool;

const SID = 'connect.sid';

module.exports = function(app, wsServer){

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
    const ip = req.headers['x-real-ip'];
    if(!user)
      return req.status(401).end(); //Unauthorized

    const username = user.username;
    console.log(`${username} (${ip}) requested to join game`);
    const result = gameInstance.join(sid, {ip, id: username});
    result.url = '/api/';
    return res.json(result);
  });

  app.post('/socialapp/lobby/join', (req, res) => {
    const sid = req.cookies[SID];
    const user = req.user;
    const ip = req.headers['x-real-ip'];
    if(!user)
      return res.status(401).end(); //Unauthorized

    const username = user.username;
    const picUrl = user.displayPicture.value;
    console.log(`${username} (${ip}) requested to join lobby`);
    console.log(`sid: ${sid}`);
    const result = lobby.join(sid, {picUrl, ip, id: username});
    result.url = '/api/';
    return res.json(result);
  });

  /*Websocket server*/
  wsServer.on('connection', function(rawWs, req){
    const sid = getCookie(req.headers.cookie, SID);
    const client = ClientPool.getClient(sid);
    if(!client){
      console.log(`Refused unexpected websocket connection from ${req.headers['x-real-ip']} (sid: ${sid})`);
      return rawWs.terminate();
    }

    client.socket = rawWs;
		console.log(`[INFO] ${client.id} opened new websocket session from ${client.ip}.`);
  });
}

function getCookie(cookieStr, name){
  const decodedCookie = decodeURIComponent(cookieStr);
  const ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length+1, c.length);
    }
  }
}
