const mongoose  = require('mongoose');
const bcrypt = require('bcrypt');
const sites = require('../config.js').OAUTH_SITES;

const defaultPic = '/defaultphoto.png';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  displayPicture: {
    value: {
      type: String,
      default: defaultPic
    },
    category: {
      type: String,
      default: "default"
    }
  },
  email: {
	  type: String,
	  required: true,
	  unique: true
  },
  oauth: {
    facebook: {
      id: {
        type: String,
        unique: true,
        sparse: true
      },
      name: {
        type: String
      },
      photoUrl: {
        type: String
      }
    },
    google: {
      id: {
        type: String,
        unique: true,
        sparse: true
      },
      name: {
        type: String
      },
      photoUrl: {
        type: String
      }
    }
  }
});

let User;

//Constants
UserSchema.statics.pictype = {
  CUSTOM_URL: "custom url",
  CUSTOM_UPLOAD: "custom upload",
  DEFAULT: "default"
}
sites.forEach((site)=>{
  UserSchema.statics.pictype[site] = site;
});


// convenience methods
UserSchema.statics.getByUsername = function(username, callback) {
  User.findOne({'username': username}, callback);
};

UserSchema.statics.getById = function(id, callback) {
  User.findOne({_id: id}, callback);
};

UserSchema.statics.validateEmail = function(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

//Errors strings
UserSchema.statics.DuplicateUser = function(user){
  return "User " + user + " already exists.";
};
UserSchema.statics.NoSuchUser = function(user){
  return "User " + user + " does not exist.";
};
UserSchema.statics.InvalidPassword = function(user){
  return "Invalid password for user " + user + ".";
};
UserSchema.statics.formatForClient = function(user){
  if(!user)
    return { profile: null, linkedProfiles: null };

  const formattedUser = {
    profile: {},
    linkedProfiles: null
  };

  //Profile
  formattedUser.profile.username = user.username;
  formattedUser.profile.email = user.email;
  formattedUser.profile.photoUrl = user.displayPicture.value;

  if(user.password)
    formattedUser.profile.passwordSet = true;
  else
    formattedUser.profile.passwordSet = false;

  //Linked accounts
  if(user.hasLinkedAccounts()){
    formattedUser.linkedProfiles = Object.assign({}, user.oauth);
    sites.forEach(site => {
      if(!formattedUser.linkedProfiles[site])
        formattedUser.linkedProfiles[site] = null;
    });
  }

  return formattedUser;
}


// instance methods
UserSchema.methods.passwordMatch = function(password, callback){
  bcrypt.compare(password, this.password, function(err, isMatch){
	  if(err)
      callback(err);
    else
	    callback(null, isMatch);
  });
};
UserSchema.methods.getId = function(){
  return this._id.toString();
};
UserSchema.methods.hasPassword = function(){
  if(this.password)
    return true;
  else
    return false;
};
// Note this function does NOT save the changes
UserSchema.methods.removeLink = function(site){
  this.oauth[site] = null;
};
UserSchema.methods.hasLinkedAccounts = function(){
  if(!this.oauth)
    return false;
  for(let i = 0; i < sites.length; i++){
    let val = sites[i];
    if(this.oauth[val] && this.oauth[val].id)
      return true;
  }
  return false

}
UserSchema.methods.hasOtherLinkedAccounts = function(site){
  for(let i = 0; i < sites.length; i++){
    let val = sites[i];
    if(val !== site && this.oauth[val] && this.oauth[val].id)
      return true;
  }
  return false;
};
UserSchema.methods.linkedWithSite = function(site){
  if(this.oauth && this.oauth[site] && this.oauth[site].id)
    return true;
  else
    return false;
};

//hooks
UserSchema.pre('save', function(next){

  if(this.isModified('oauth')){
    for(let i = 0; i < sites.length; i++){
      let site = sites[i];
      if(this.isModified('oauth.' + site + '.id')){
        if(this.oauth[site].id && this.displayPicture.value === defaultPic){
          //then we have just added/modified existing id & no current pic set
          this.displayPicture.value = this.oauth[site].photoUrl;
          this.displayPicture.category = site;
        } else {
          // Then we have removed it.
          if(this.displayPicture.category === site){
            //Must set it to something else
            for(j = 0; j < sites.length; j++){
              if(this.linkedWithSite(sites[j])){
                this.displayPicture.value = this.oauth[sites[j]].photoUrl;
                this.displayPicture.category = sites[j];
                break;
              }
              if(sites.length - 1 === j){
                this.displayPicture.category = this.DEFAULT;
                this.displayPicture.value = defaultPic;
              }
            }
          }
        }
      }
    }
  }

  if(this.password && this.isModified('password')){
    // If a password is being saved, we must hash it
    bcrypt.hash(this.password, 10, (err, hash) => {
      if(err)
        return next(err);
      this.password = hash;
      return next();
    });
  } else {
    return next();
  }

});


User = module.exports = mongoose.model('User', UserSchema);
