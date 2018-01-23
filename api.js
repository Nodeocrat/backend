const Config = require('./config');
const API_ROOT = Config.API_ROOT;
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

module.exports = function(app, server) {

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

  //Node social
  require(API_ROOT + '/NodeSocial/node-social.js')(app, server);

};
