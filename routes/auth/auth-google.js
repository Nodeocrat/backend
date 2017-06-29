const Config = require('../../config.js');
const express = require('express');
const User = require(Config.API_ROOT + '/models/user.js');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


module.exports = function(){
  const route = express.Router();

  // Use the GoogleStrategy within Passport.
  //   Strategies in Passport require a `verify` function, which accept
  //   credentials (in this case, an accessToken, refreshToken, and Google
  //   profile), and invoke a callback with a user object.
  passport.use(new GoogleStrategy({
      clientID: Config.GOOGLE_CLIENT_ID,
      clientSecret: Config.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://www.nodeocrat.com/api/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      //console.log(JSON.stringify(profile));
      User.findOne({'oauth.google.id': profile.id}, function(err, user){
        if(err){
          return done(err);
        } else if(!user){
          return done(null, false, profile);
        } else {
          const fullName = profile.name.givenName + " " + profile.name.familyName;
          if(user.oauth.google.name !== fullName){
            user.oauth.google.name = fullName;
            user.save((err, user)=>{
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
  route.get('/google', function(req, res, next){
    if(req.header('Referer'))
      req.flash('backUrl', req.header('Referer'));
    else
      req.flash('backUrl', '/');
    next();
  }, passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'email'] }));

  route.get('/google/callback', function(req, res, next) {

    // A custom verify callback is necessary due to the need to flash the
    // profile parameters' properties
    passport.authenticate('google', function(err, user, profile) {
      if(err)
        return next(err);
      if(!user)
        return res.redirect(req.flash('backUrl') + '?showLogin=true&loginErr=Google');

      req.logIn(user, function(err) {
        if(err)
          return next(err);
        return res.redirect(req.flash('backUrl'));
      });
    })(req, res, next);
  });

  return route;
};
