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
app.use(session({
    secret: 'dogjdsoijqE4rt89q3ur4rt£W$T*IQfiaf83q489rth8y',
    saveUninitialized: false,
	  resave: false,
    secure: true,
    store: new MongoStore({url: mongoUrl})
}));

require(API_ROOT + 'api')(app);

const server = require('http').createServer(app);
const io    = require( "socket.io" )();
require(API_ROOT + 'shooty-balls/shooty-balls-app.js')(app, io);
io.attach(server);

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
