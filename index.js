const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const MongoStore = require('connect-mongo')(session);

const port = 8080;
const mongoUrl = 'mongodb://localhost:27017/test';

mongoose.connect(mongoUrl);

const app = express();

//production specific stuff
app.use(helmet({
  ieNoOpen: false,
  dnsPrefetchControl: false
}));
app.use(session({
    secret: 'dogjdsoijqE4rt89q3ur4rt£W$T*IQfiaf83q489rth8y',
    saveUninitialized: false,
	  resave: false,
    secure: true,
    store: new MongoStore({url: mongoUrl})
}));

require('./api')(app);




var server = require('http').createServer(app);

//TLS
/*const options = {
    key: fs.readFileSync(__dirname + '/tls/server.key'),
    cert: fs.readFileSync(__dirname + '/tls/server.crt')
};
//const options = {};

//Start server
require('spdy').createServer(options, app)
	.listen(port, (error) => {
		if(error){
			console.error(error);
			return process.exit(1);
		} else {
			console.log('Listening on port: ' + port + ' (http2)');
		}
	});
*/

/*require('http2').createServer(options, function(request, response) {
  response.end('Hello world!');
}).listen(port, (error) => {
      if(error){
          console.error(error);
          return process.exit(1);
      } else {
          console.log('Listening on port: ' + port)
      }
  });
*/

server.listen(port, (err) => {
  if(err){
    console.error(err);
    process.exit(1);
  } else {
    console.log('Listening on port: ' + port + ' (http)');
  }
});


//TODO
/*
Set cookie security options
Set the following cookie options to enhance security:

secure - Ensures the browser only sends the cookie over HTTPS.
httpOnly - Ensures the cookie is sent only over HTTP(S), not client JavaScript, helping to protect against cross-site scripting attacks.
domain - indicates the domain of the cookie; use it to compare against the domain of the server in which the URL is being requested. If they match, then check the path attribute next.
path - indicates the path of the cookie; use it to compare against the request path. If this and domain match, then send the cookie in the request.
expires - use to set expiration date for persistent cookies.
Here is an example using cookie-session middleware:

var session = require('cookie-session');
var express = require('express');
var app = express();

var expiryDate = new Date( Date.now() + 60 * 60 * 1000 ); // 1 hour
app.use(session({
  name: 'session',
  keys: ['key1', 'key2'],
  cookie: { secure: true,
            httpOnly: true,
            domain: 'example.com',
            path: 'foo/bar',
            expires: expiryDate
          }
  })
);
*/
