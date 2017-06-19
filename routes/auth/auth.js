const Config = require('../../config');
const API_ROOT = Config.API_ROOT;
const sites = Config.OAUTH_SITES;
const express = require('express');
const User = require('../../models/user');

module.exports = function() {

  const router = express.Router();

  router.post('/logout', function(req, res){
    req.logout();
    res.json({'user': User.formatForClient()});
  });

  router.use(require(API_ROOT + '/routes/auth/auth-local.js')());
  sites.forEach((site)=>{
    router.use(require(API_ROOT + '/routes/auth/auth-' + site + '.js')());
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
