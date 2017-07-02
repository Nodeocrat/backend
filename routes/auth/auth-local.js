const config = require('../../config.js');
const API_ROOT = config.API_ROOT;
const UTILS = config.UTILS;
const express = require('express');
const User = require(API_ROOT + '/models/user.js');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

module.exports = function() {
  const router = express.Router();

  passport.use(new LocalStrategy(
    function(username, password, done) {
      User.getByUsername(username, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
          return done(null, false, {msg: "That username has not been registered"});
        }
        user.passwordMatch(password, function(err, isMatch){
          if(isMatch){
            return done(null, user);
          } else {
            //Incorrect password
            return done(null, false, {msg: "Incorrect password"});
          }
        });
      });
    }
  ));

  router.post(
	  '/local',
    function(req, res, next){
      let errors = [];
      if(!req.body.password)
        return res.json({"errors": ["Password must be supplied"]});
      if(!req.body.username)
        return res.json({"errors": ["Username must be supplied"]});

      passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user)
          return res.json({"errors": [info.msg]});

        req.logIn(user, function(err) {
          if (err)
            return next(err);

          return res.json({'user': User.formatForClient(user)});
        });
      })(req, res, next);
    }
  );

  router.post(
    '/guest',
    function(req, res, next){

      const randomStr = require(UTILS + '/random-string.js')(6);
      const username = `Guest#${randomStr}`;
      const email = `${username}@nodeocrat.com`;
      const password = 'password';

      req.body = {username, password};

      let newUser = new User();
      newUser['username'] = username;
      newUser['email'] = email;
      newUser['password'] = password;
      User.create(newUser, function(err, user){
        if(err)
          return res.status(status.BAD_REQUEST).end();

        passport.authenticate('local', function(err, user, info) {
          if (err) { return next(err); }
          if (!user)
            return res.json({"errors": [`Error while attempting to log in as guest: ${info.msg}`]});

          req.logIn(user, function(err) {
            if (err)
              return next(err);

            return res.json({'user': User.formatForClient(user)});
          });
        })(req, res, next);
      });
    }
  );

  return router;
};
