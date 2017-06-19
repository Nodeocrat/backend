const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const helmet = require('helmet');
const MongoStore = require('connect-mongo')(session);
const API_ROOT = require('./config').API_ROOT;

const port = 8080;
const mongoUrl = 'mongodb://localhost:27017/test';

mongoose.connect(mongoUrl);

const app = express();

//production stuff: helmet for extra security, mongostore for session storage
app.use(helmet({
  ieNoOpen: false,
  dnsPrefetchControl: false
}));

const sessionMiddleware = session({
    secret: 'dogjdsoijqE4rt89q3ur4rt£W$T*IQfiaf83q489rth8y',
    saveUninitialized: false,
	  resave: false,
    secure: true,
    store: new MongoStore({url: mongoUrl})
});

app.use(sessionMiddleware);
const server = require('http').createServer(app);

// Setup socket.io. Session middleware given so 'user' can be accessed in
// socket.io via socket.request.user in the same way as in express via req.user
const socketIo = require(API_ROOT + '/socket-io-setup.js')(server, sessionMiddleware);

// api setup
require(API_ROOT + '/api')(app, socketIo);

// start server
server.listen(port, (err) => {
  if(err){
    console.error(err);
    process.exit(1);
  } else {
    console.log('Listening on port: ' + port + ' (http)');
    if(process.env.NODE_ENV !== "production")
      console.log("Running in development mode");
    else
      console.log("Running in production mode");
  }
});
