const Config = require('./config');
const API_ROOT = Config.API_ROOT;

const bodyParser = require('body-parser');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const status = require('http-status');
const dbtools = require(API_ROOT + '/models/dbtools');
const constants = require(API_ROOT + '/constants.js');
const sites = Config.OAUTH_SITES;

// models
const User = require(API_ROOT + '/models/user.js');

// routes
const auth = require(API_ROOT + '/routes/auth/auth.js');

module.exports = function(app) {

  // Helper routes
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(flash());

  // Authorization routes
  app.use(auth());
  app.use(require(API_ROOT + '/routes/auth/auth-local.js')());
  sites.forEach((site)=>{
    app.use(require(API_ROOT + '/routes/auth/auth-' + site + '.js')());
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

    if(!profile)
      return res.json({"errors": "Invalid data sent to server"});

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

};
