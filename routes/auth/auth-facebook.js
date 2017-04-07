const Config = require('../../config');
const API_ROOT = Config.API_ROOT;
const express = require('express');
const User = require(API_ROOT + 'models/user.js');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;

module.exports = function(){
  const route = express.Router();

  passport.use(new FacebookStrategy(
    {
      clientID: Config.facebookClientId,
      clientSecret: Config.facebookClientSecret,
      callbackURL: 'https://www.nodeocrat.com/api/auth/facebook/callback',
      // Necessary for new version of Facebook graph API
      profileFields: ['id', 'emails', 'name']
    },
    function(accessToken, refreshToken, profile, done) {
      User.findOne({ 'oauth.facebook.id': profile.id }, function(err, user){
        if(err){
          return done(err);
        } else if(!user) {
          return done(null, false, profile);
        } else { // We have a registered user
          //Check the name is still the sample
          //Format of profile:
          //{..., "name":{"familyName":"Phillips","givenName":"Ashley"} }
          const fullName = profile.name.givenName + " " + profile.name.familyName;
          if(user.oauth.facebook.name !== fullName){
            user.oauth.facebook.name = fullName;
            user.save((err, user) => {
              if(err) return done(err);
              else return done(null, user);
            });
          } else {
            return done(null, user);
          }
        }
      });
    }
  ));

  // Express routes for auth
  route.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  route.get('/auth/facebook/callback', function(req, res, next) {

    // A custom verify callback is necessary due to the need to flash the
    // profile parameters' properties
    passport.authenticate('facebook', function(err, user, profile) {
      if (err) { return next(err); }
      if(!user){
        if(req.header('Referer'))
          return res.redirect(req.header('Referer') + '?showLogin=true&loginErr=Facebook');
        else
          return res.redirect('/?showLogin=true&loginErr=Facebook');
      }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        if(req.header('Referer'))
          return res.redirect(req.header('Referer'));
        else
          return res.redirect('/');
      });
    })(req, res, next);
  });

  return route;
};
