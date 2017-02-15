exports.exists = function(model, path, value, callback){
  model.count({[path]: value}, function(err, count){
    if(err)
      return callback(err);

    callback(null, count ? true : false);
  });
};
