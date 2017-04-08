const Config = require('../../config');
const API_ROOT = Config.API_ROOT;
const express = require('express');
const User = require(API_ROOT + '/models/user.js');
const status = require('http-status');
const constants = require(API_ROOT + '/constants.js');
const dbtools = require(API_ROOT + '/models/dbtools.js');

const sites = Config.OAUTH_SITES;
const ensureAuthenticated = require(API_ROOT + '/routes/auth/auth').ensureAuthenticated;

module.exports = function(){

  const router = express.Router();

  router.get('/user', function(req, res){
    if(req.user) {
      let linkedProfiles = {};
      if(req.user.oauth){
        if(req.user.oauth.facebook)
          linkedProfiles.facebook = req.user.oauth.facebook;
        else
          linkedProfiles.facebook = null;

        if(req.user.oauth.google)
          linkedProfiles.google = req.user.oauth.google;
        else
          linkedProfiles.google = null;
      }
      const passwordSet = req.user.password ? true : false;
      return res.json({
        signedIn: true,
        profile: {
          username: req.user.username,
          email: req.user.email,
          photoUrl: req.user.displayPicture.value,
          passwordSet: passwordSet
        },
        linkedProfiles: linkedProfiles
      });
    } else {
      return res.json({
        signedIn: false,
        profile: null
      });
    }
  });

  router.post('/register', function(req, res){
    if(!req.body)
      res.status(500).end();

    Promise.resolve(new Promise((resolve, reject) => {

      if(process.env.NODE_ENV !== "production")
        return resolve();

      const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const sendData = 'secret=' + Config.recaptchaSecret + '&response='
        + req.body.recaptchaResponse + '&remoteip=' + ipAddr;
      const options = {
        method: 'post',
        body: sendData,
        url: 'https://www.google.com/recaptcha/api/siteverify',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      };

      const request = require('request');
      request(options, (error, response, body) => {
        if(error){
          return reject();
        } else if(response.statusCode != 200){
          return reject();
        } else {
          let response = null;
          try {
            response = JSON.parse(body);
          } catch (e) {
            return reject();
          }

          if(!response || !response.success)
            return reject();
          else
            return resolve();
        }
      });
    }))
    .then(() => {
      let newUser = new User();
      newUser['username'] = req.body.username;
      newUser['email'] = req.body.email;
      newUser['password'] = req.body.password;
      sites.forEach((site)=>{
        if(req.body.profiles && req.body.profiles[site]){
          const profile = req.body.profiles[site];
          newUser['oauth'][site].id = profile.id;
          newUser['oauth'][site].photoUrl = profile.photoUrl;
          newUser['oauth'][site].name = profile.name;
        }
      });

      let actions = [];
      let errors = [];
      let promises = [];

      if(!req.body.password){

        if(req.body.profiles){
          for(i = 0; i < sites.length; i++){
            if(req.body.profiles[sites[i]] && req.body.profiles[sites[i]].id)
              break;
            else if (i === sites.length - 1)
              errors.push(constants.registration.PASSWORD_OR_SOCIAL_REQUIRED);
          }
        } else {
          errors.push(constants.registration.PASSWORD_OR_SOCIAL_REQUIRED);
        }
      }


      if(!req.body.username)
        errors.push(constants.registration.USERNAME_REQUIRED);
      if(!req.body.email)
        errors.push(constants.registration.EMAIL_REQUIRED);
      if(!req.body.email || !User.validateEmail(req.body.email))
        errors.push(constants.account.INVALID_EMAIL);

      sites.forEach((site)=>{
        if(req.body.profiles && req.body.profiles[site] && req.body.profiles[site].id){
          promises.push(new Promise((resolve, reject) => {
            dbtools.exists(User, 'oauth.' + site + '.id', req.body.profiles[site].id, (err, exists)=>{
              if(err)
                reject();

              if(exists)
                errors.push(constants.registration.DUPLICATE_SOCIAL_ACCOUNT(site));

              resolve();
            });
          }));
        }
      });

      if(req.body.username){
        promises.push(new Promise((resolve, reject)=>{
          dbtools.exists(User, 'username', req.body.username, (err, exists)=>{
            if(err)
              reject();

            if(exists)
              errors.push(constants.account.DUPLICATE_USERNAME);

            resolve();
          });
        }));
      }

      if(req.body.email){
        promises.push(new Promise((resolve, reject)=>{

          //TODO check that email is valid /w regular expression.

          dbtools.exists(User, 'email', req.body.email, (err, exists)=>{
            if(err)
              reject();

            if(exists)
              errors.push(constants.account.DUPLICATE_EMAIL);

            resolve();
          });
        }));
      }

      Promise.all(promises).then(()=>{

        if(errors.length > 0)
          return res.json({"errors": errors});
        User.create(newUser,
        function(err, user){
          if(err)
            return res.status(status.BAD_REQUEST).end();

          res.json({"actions": ["Registration successful"]});
        });
      })
      .catch((reason)=>{
        res.status(500).end();
      });
    })
    .catch((e) => {
      return res.json({"errors": constants.registration.RECAPTCHA_ERROR});
    });
  });

  router.post('/update', ensureAuthenticated, function(req, res){

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

  router.post('/unlink/:site', function(req, res){
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

  router.post('/link/:site', function(req, res){

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

  return router;

}
