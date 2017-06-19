const Config = require('./config');
const API_ROOT = Config.API_ROOT;

const bodyParser = require('body-parser');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const status = require('http-status');
const dbtools = require(API_ROOT + '/models/dbtools');
const constants = require(API_ROOT + '/constants.js');

// models
const User = require(API_ROOT + '/models/user.js');

module.exports = function(app, io) {

  // Essentials/setup
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(flash());

  // Authorization API
  app.use(require(API_ROOT + '/routes/auth/auth-init.js')());
  app.use('/auth', require(API_ROOT + '/routes/auth/auth.js')());

  // Account API
  app.use('/account', require(API_ROOT + '/routes/account/account.js')());

  if(io){
    // Game project
    require(API_ROOT + '/NodeSocial/node-social.js')(app, io);
    //require(API_ROOT + '/shooty-balls/shooty-balls-app.js')(app, io);
  }

};
