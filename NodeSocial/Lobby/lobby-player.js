const States = {
  ACTIVE: 'ACTIVE',
  IN_GAME: 'IN_GAME',
  DISCONNECTED: 'DISCONNECTED'
};

module.exports = class LobbyPlayer {
  constructor({client, picUrl, username}){
    if(!client)
      return console.log('lobby-player: Must provide client in constructor when creating LobbyPlayer');
    if(!username)
      return cosole.log('lobby-player: Must provide username in constructor');

    this._client = client;
    this._picUrl = picUrl;
    this._username = username;
    this._status = States.PENDING;

  }

  get client(){
    return this._client;
  }

  get username(){
    return this._username;
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
