const express = require('express');
const path = require('path');
const status = require('http-status');
const User = require(path.resolve(__dirname, 'models','user.js'));
const constants = require('./constants.js');
const dbtools = require('./models/dbtools.js');
const config = require('./config.js');
const passport = require('passport');

const sites = config.OAUTH_SITES;

module.exports = function() {

  const router = express.Router();

  router.use(passport.initialize());
  router.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    /*User.getById(id, function (err, user) {
      done(err, user);
    });*/
    User.
      findOne({ _id : id }).
      exec(done);
  });

  router.post('/register', function(req, res){
    if(!req.body)
      res.status(500).end();

    Promise.resolve(new Promise((resolve, reject) => {

      if(process.env.NODE_ENV !== "production")
        resolve();

      const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const sendData = 'secret=' + config.recaptchaSecret + '&response='
        + req.body.recatchaResponse + '&remoteip=' + ipAddr;
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
            resolve();
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
      if(!newUser.emailIsValid())
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

  router.post('/logout', function(req, res){
    req.logout();
    res.redirect('/login');
  });

  router.get('/login', function(req, res){
    res.locals.login_error = req.flash('login_error');
    res.render('login');
  });

  router.get('/register', function(req, res){
    res.locals.email = req.flash('email') || null;
    sites.forEach((site)=>{
      res.locals[site + 'Name'] = req.flash(site + "Name") || null;
      res.locals[site + 'Id'] = req.flash(site + "Id") || null;
      res.locals[site + 'PhotoUrl'] = req.flash(site + "PhotoUrl")|| null;
    });
    res.render('register');
  });

  return router;
};

module.exports.ensureAuthenticated = function(req, res, next){
  if(req.user){
    return next();
  } else {
    res.redirect('/login');
  }
};
