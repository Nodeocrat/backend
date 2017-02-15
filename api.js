const bodyParser = require('body-parser');
const flash = require('connect-flash');
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const exphbs = require('express-handlebars');
const session = require('express-session');
const status = require('http-status');
const dbtools = require('./models/dbtools');
const constants = require('./constants.js');
const sites = require('./config.js').OAUTH_SITES;

// models
const User = require('./models/user.js');

// routes
const auth = require('./auth');

// other
const ROOT = '/home/ashley/development/Projects/template_projects/http2_backend_template/';

module.exports = function(app) {

  //app.use(express.static(__dirname + '/client'));

  //handlebars setup
  app.set('views', path.join(__dirname, 'views'));
  app.engine('handlebars', exphbs({defaultLayout:'layout'}));
  app.set('view engine', 'handlebars');

  // Helper routes
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(flash());

  // Authorization routes
  app.use(auth());
  app.use(require('./routes/auth-local.js')());
  sites.forEach((site)=>{
    app.use(require('./routes/auth-' + site + '.js')());
  });
  //TODO set global vars here for use in the views
  app.use(function (req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;

    next();
  });

  app.get('/', function(req, res){
    res.render('index');
  });

  app.get('/account', auth.ensureAuthenticated, function(req, res){
    const user = res.locals.user;
    res.render('account');
  });

  app.post('/account/update', auth.ensureAuthenticated, function(req, res){

    const user = req.user;

    const username = req.body.username || null;
    const email = req.body.email || null;
    const newPassword = req.body.newPassword || null;
    const currentPassword = req.body.currentPassword || null;
    let tasks = [];
    let actions = [];
    let errors = [];

    if(username && username !== user.username){
      tasks.push(new Promise(function(resolve, reject){
        dbtools.exists(User, 'username', username, function(err, exists){
          if(err){
            return reject(err);
          }

          if(exists){
            errors.push(constants.account.DUPLICATE_USERNAME);
          } else {
            user.username = username;
            actions.push(constants.account.USERNAME_UPDATE);
          }
          resolve();
        });
      }));
    }
    if(email && email !== user.email){
      if(!User.validateEmail(email)){
        errors.push(constants.account.INVALID_EMAIL);
      } else {
        tasks.push(new Promise(function(resolve, reject){
          dbtools.exists(User, 'email', email, function(err, exists){
            if(err)
              return reject(err);

            if(exists){
              errors.push(constants.account.DUPLICATE_EMAIL);
            } else {
              user.email = email;
              actions.push(constants.account.EMAIL_UPDATE);
            }
            resolve();
          });
        }));
      }
    }
    if(newPassword){
      //TODO check that new password does not equal current password.
      //TODO future: email confirmation if no current password
      tasks.push(new Promise(function(resolve, reject){

        if(user.hasPassword()){

          if(!currentPassword){
            errors.push(constants.account.INCORRECT_PASSWORD);
            return resolve();
          }

          user.passwordMatch(currentPassword, function(err, isMatch){
            if(err)
              return reject(err);

            if(!isMatch){
              errors.push(constants.account.INCORRECT_PASSWORD);
              return resolve();
            }

            //We have a match. update password and save user.
            user.password = newPassword;
            actions.push(constants.account.PASSWORD_UPDATE);
            return resolve();
          });
        } else {
          user.password = newPassword;
          actions.push(constants.account.PASSWORD_UPDATE);
          return resolve();
        }
      }));
    }

    Promise.all(tasks).then(() => {
      if(errors.length > 0)
        return res.json({'errors': errors});

      user.save((err, updatedUser) => {
        if(err)
          return res.status(status.BAD_REQUEST).json({'errors': errors});

        if(!updatedUser)
          return res.status(500).json({'error': "Account failed to update. Please contact admin."});

        res.json({'actions': actions});
      });
    })
    .catch(function(reason){
      console.error(reason);
      res.status(500).end();
    });

  });

  app.post('/account/unlink/:site', function(req, res){
    const site = req.params.site;
    const user = req.user;

    if(user.hasPassword() || user.hasOtherLinkedAccounts(site)){
      if(!user.linkedWithSite(site))
        return res.json({"errors": ["Account is not linked with " + site]});
      user.removeLink(site)

      user.save((err, updatedUser)=>{
        if(err)
          return res.status(500).end();
        return res.json({"actions": ["Account unlinked from " + site.charAt(0).toUpperCase() + site.slice(1)]});
      });
    } else {
      res.json({"errors": ["You must have a password or another social networking account linked, in order to unlink your " + site + " account."]});
    }

  });

  app.post('/account/link/:site', function(req, res){

    let profile = null;
    try {
      profile = req.body.profile;
    } catch(e) {
      return res.json({"errors": "Invalid data sent to server"});
    }

    const site = req.params.site;
    const user = req.user;
    const siteStr = site.charAt(0).toUpperCase() + site.slice(1);
    const queryPath = 'oauth.' + site + '.id';

    //TODO create option for 'swap' ... i.e. unlink and link all in one. But no need
    // for the unlink validation like above. If present, it means we do not need
    // to bother validating if the user already has a fb ID.. we just overwrite it.

    dbtools.exists(User, queryPath, profile.id, function(err, exists){
      if(err)
        return res.status(500).end();

      if(exists){
        res.json({"errors": [constants.registration.DUPLICATE_SOCIAL_ACCOUNT(site)]});
      } else {
        user.oauth[site].id = profile.id;
        user.oauth[site].photoUrl = profile.photoUrl;
        user.oauth[site].name = profile.name;
        user.save((err, updatedUser)=>{
          if(err)
            return res.status(500).end();
          res.json({"actions": [siteStr + " account linked successfully"]});
        });
      }
    });
  });

  app.get('/blog', (req, res)=>{
    res.render('blog');
  });

  app.get('/blog/apalg', (req, res)=>{
    res.render('auslander-parter');
  });


};
