const express = require('express');
const status = require('http-status');
const path = require('path');
const User = require(path.resolve(__dirname,'..','models','user.js'));

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
	  '/login/local',
    function(req, res, next){
      let errors = [];
      if(!req.body.password)
        return res.json({"errors": ["Password must be supplied"]});
      if(!req.body.username)
        return res.json({"errors": ["Username must be supplied"]});

      // custom authentication
      passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user){
          if(req.body.redirect === false)
            return res.json({"errors": [info.msg]});

          req.flash('login_error', info.msg);
          return res.redirect('/login');
        }

        req.logIn(user, function(err) {
          if (err) { return next(err); }
          if(req.body.redirect === false)
            return res.json({'login': 'success'});
          else
            return res.redirect('/');
        });
      })(req, res, next);
      //next();
    }
    // old/regular way...
    /*passport.authenticate('local'),
    function(req, res, next){

      if(req.body.redirect === false)
        return res.json({'login': 'success'});

      return res.redirect('/');
    }*/
  );

  return router;
};