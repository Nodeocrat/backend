const passport = require('passport');
const User = require(API_ROOT + '/models/user');

module.exports = function(server, sessionMiddleware){
  const io = require( "socket.io" )();
  io.use((socket, next) => sessionMiddleware(socket.request, socket.request.res, next));
  io.use((socket, next) => passport.initialize()(socket.request, socket.res,next));
  io.use((socket, next) => passport.session()(socket.request, socket.res,next));
  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });
  passport.deserializeUser(function(id, done) {
    User.
      findOne({ _id : id }).
      exec(done);
  });
  io.attach(server);
  return io;
}
