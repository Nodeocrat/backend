const Config = require('../config');
const API_ROOT = Config.API_ROOT;

const assert = require('assert');
const express = require('express');
const superagent = require('superagent');
const mongoose = require('mongoose');
const status = require('http-status');
const session = require('express-session');
const constants = require(API_ROOT + 'constants');

// Convenience constants
const port = 3000;
const passwordStr = 'testpass';
const URL_ROOT = 'http://localhost:' + port + '/';

// Convenience functions
function parseJsonResponse(res) {
  let result;
  assert.doesNotThrow(function(){
	  result = JSON.parse(res.text);
  });

  return result;
}

function getCookie(res, cookieName){
  const cookiesArr = res.header['set-cookie'];
  assert(cookiesArr.length >= 1);
  const cookieStr = cookiesArr[0];
  //format: 'connect.sid=s%3AZWQuoLWT-Rn3LB3qnoBngzjOnA0me_l_.emBnDWDLysxdaHI3qbeXNxCW7dLlKUBPapKM6WiVn8Q; Path=/; HttpOnly'
  //TODO REPLACE THE FOLLOWING (WRAPPED IN ASTERISKS) WITH REGULAR EXPRESSION ASAP. (just get ben)
  //****************************************************************************
  const cookieStrList = cookieStr.split('; ');
  let ele = null;
  for(i = 0; i < cookieStrList.length; i++){
    let currentEle = cookieStrList[i];
    if(currentEle.includes('connect.sid')){
      ele = currentEle;
      break;
    }
  }
  assert(ele);
  let components = ele.split('=');
  assert.equal(components.length, 2);
  //****************************************************************************

  return components[1];

}

describe('API', function() {
  //TODO Check accessing authorized areas works as expected when logged out and
  //logged in (with sufficient and insufficient priviledges)


  let server;
  let app;
  let User;
  let sessionCookieString = null;
  let username1 = 'Zukias';
  let email1 = 'ashleyp1621@gmail.com';
  let originalID;

  before(function() {
    app = express();
	  mongoose.connect('mongodb://localhost:27017/test');

    User = require(API_ROOT + 'models/user');
	  User.remove({}, function(error){
		  assert.ifError(error);
	  });

    User.collection.dropIndexes();


    app.use(session({
        secret: 'secret_string',
        saveUninitialized: false,
    	  resave: false,
        secure: true
    }));

    require(API_ROOT + 'api')(app);

    server = app.listen(port);
  });

  after(function() {
    server.close();
  });

  describe('Login System', function(){
    it('Can register a user using site registration', function(done) {
    	const url_path = 'register/';
    	superagent
    	  .post(URL_ROOT + url_path)
    	  .send({ username: username1, password: passwordStr, email: email1 })
    	  .end(function(err, res){
      		if(err){
      		  console.log("Error: " + err.message);
      		  throw new Error(err.message);
      		}

          assert.equal(res.status, 200);

          //Ensure that password has been hashed (i.e. passwordStr !== user.password)
          User.findOne({username: username1, email: email1}, function(err, user){
            assert.ifError(err);
            assert(user);
            assert.notEqual(user.password, passwordStr);
            originalID = user.getId();
            done();
          });
    	  });
    });

    it('Correct and incorrect user login works as expected', (done) => {
    	//test user created previously
    	const url_path = 'login/local';
    	let tasks = [];

      [
        {username: 'Zukias'},
    	  {username: 'Zukias', password: ''},
    	  {username: 'Zukias', password: 'wrong_password'},
        {username: '', password: passwordStr},
        {password: passwordStr},
        {username: '232riufj', password: passwordStr}
      ]
      .forEach((data) => {
        data.redirect = false;
    	  tasks.push(new Promise((resolve, reject) => {
      		superagent
      	    .post(URL_ROOT + url_path)
      	    .send(data)
      	    .end((err, res) => {
        		  if(err){
                console.log(err.status);
                return reject(err.status);
              }

        		  assert.equal(res.status, status.OK);
              const result = parseJsonResponse(res);
              assert(result.errors.length > 0);
        		  return resolve();
      	    });
    	  }));
    	});

      Promise.all(tasks).then(() => {
        //Then check the correct login works
        superagent
          .post(URL_ROOT + url_path)
          .send({
            username: 'Zukias',
            password: passwordStr,
            redirect: false
          })
          .end((err, res) => {
            assert.ifError(err);
            assert.equal(res.status, status.OK);

            sessionCookieString = 'connect.sid=' + getCookie(res, 'connect.sid');

            done();
          });
    	})
    	.catch((reason) => {
        console.error("Promise rejected");
    	  process.nextTick(() => {throw new Error(reason)});
    	});
    });

  });

  describe('account update', () => {
    //All this is executed after previous describe statements.

    it('Does not update account when invalid data given', (done) => {
      const url_path = 'account/update';
      const duplicateUsername = 'duplicateuser';

      const duplicateTest = new Promise((resolve, reject) => {
        // Create new user in database with duplicate name
        User.create(
        {
          username: duplicateUsername,
          email: 'test@test.com',
          password: 'somepassword'
        },
        function(err, user){
          if(err){
            console.log("ERROR: " + err);
            throw new Error(err.message);
          }
          //Send wrong email and wrong password
          const invalidEmail = 'invalidemailaddress';

          superagent
            .post(URL_ROOT + url_path)
            .set('cookie', sessionCookieString)
            .send({
              email: invalidEmail,
              username: duplicateUsername
            })
            .end(function(err, res){
              if(err){
                console.log(err.status);
                return reject(err.message);
              }
              assert.equal(res.status, status.OK);

              let result;
              result = parseJsonResponse(res);
              const errors = result.errors;
              assert(errors);
              assert.equal(errors.length, 2);
              assert(errors.includes(constants.account.DUPLICATE_USERNAME));
              assert(errors.includes(constants.account.INVALID_EMAIL));

              let promises = [];
              [
                {username: duplicateUsername},
                {email: invalidEmail}
              ]
              .forEach((query) => {
            	  promises.push(new Promise((resolve, reject) => {
              		User.find(query, (err, users) => {
                    assert.ifError(err);

                    if(users){
                      users.forEach(function(user){
                        assert.notEqual(user.getId(), originalID);
                      });
                    }
                    resolve();
                  });
            	  }));
            	});

              Promise.all(promises).then(() => {
                resolve();
              }).catch((reason) => {
                console.error("Promise rejected");
                process.nextTick(() => {throw new Error(reason)});
              });
            }); // Superagent response
        }); // User.create callback
      });

      const wrongPasswordTest = new Promise((resolve, reject) => {
        //Send wrong email and wrong password
        const newPass = 'newpass';
        const wrongPass = 'wrongpass';

        superagent
          .post(URL_ROOT + url_path)
          .set('cookie', sessionCookieString)
          .send({
            currentPassword: wrongPass,
            newPassword: newPass
          })
          .end(function(err, res){
            if(err){
              console.log(err.status);
              return reject(err.message);
            }
            assert.equal(res.status, status.OK);

            let result;
            result = parseJsonResponse(res);
            const errors = result.errors;
            assert(errors);
            assert.equal(errors.length, 1);
            assert(errors.includes(constants.account.INCORRECT_PASSWORD));

            User.findOne({username: username1, email: email1}, function(err, user){
              assert.ifError(err);
              assert(user);
              user.passwordMatch(newPass, (err, isMatch) => {
                assert.ifError(err);
                assert(!isMatch);
                resolve();
              });
            });
          }); // Superagent response
      });

      Promise.all([duplicateTest, wrongPasswordTest]).then(() => {
        done();
      }).catch((reason) => {
        console.error("Promise rejected");
        process.nextTick(() => {throw new Error(reason)});
      });
    }); // it Does not update account when invalid data given

    it('can process valid update', function(done){
      const url_path = 'account/update';
      //Send wrong email and wrong password
      const newUsername = 'newUsername';
      const newPass = 'newpass';
      const newEmail = 'newaddress@domain.com';

      superagent
        .post(URL_ROOT + url_path)
        .set('cookie', sessionCookieString)
        .send({
          currentPassword: passwordStr,
          newPassword: newPass,
          email: newEmail,
          username: newUsername
        })
        .end(function(err, res){
          if(err){
            console.log(err.status);
            throw new Error(err.message);
          }
          assert.equal(res.status, status.OK); //200

          let result;
          result = parseJsonResponse(res);
          const actions = result.actions;
          assert(actions);
          assert.equal(actions.length, 3);
          assert(actions.includes(constants.account.PASSWORD_UPDATE));
          assert(actions.includes(constants.account.USERNAME_UPDATE));
          assert(actions.includes(constants.account.EMAIL_UPDATE));
          User.findOne({username: newUsername, email: newEmail}, function(err, user){
            assert.ifError(err);
            assert(user);
            assert.notEqual(user.password, newPass);
            user.passwordMatch(newPass, (err, isMatch) => {
              assert.ifError(err);
              assert(isMatch);
              done();
            });
          });
        });
    });
  });

  describe('Login System', function(){
    it('can log users out', function(done) {
      const url_path = 'logout';
      superagent
        .post(URL_ROOT + url_path)
        .end(function(err, res){
          assert.ifError(err);
          assert.equal(res.status, status.OK);
          done();
        });
      //TODO try to access a resource which requires authorization, which should send back a status 401
    });
  });



});
