const States = {
  ACTIVE: 'ACTIVE',
  IN_GAME: 'IN_GAME'
};

module.exports = class LobbyPlayer {
  constructor({client, picUrl}){
    if(!client)
      return console.log('Must provide client in constructor when creating LobbyPlayer');

    this._client = client;
    this._picUrl = picUrl;
    this._status = States.PENDING;
    
  }

  get client(){
    return this._client;
  }

  get username(){
    return this._client.username;
  }

  get picUrl(){
    return this._picUrl;
  }

  get profile(){
    return {
      picUrl: this._picUrl,
      status: this._status,
      username: this.username
    };
  }

  get status(){
    return this._status;
  }

  set status(status){
    this._status = status;
  }
}

module.exports.States = States;
