const API_ROOT = require('../../config').API_ROOT;
const User = require(API_ROOT + '/models/user');
const passport = require('passport');
const express = require('express');

module.exports = function(){

  const router = express.Router();

  router.use(passport.initialize());
  router.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    User.
      findOne({ _id : id }).
      exec(done);
  });

  return router;
}
