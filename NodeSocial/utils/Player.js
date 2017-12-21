module.exports = class Player {
  constructor({client, picUrl}){
    this._client = client;
    this._picUrl = picUrl;
    this._lobbyStatus = 'PENDING';
  }

  get username(){
    return this._client.username;
  }

  get picUrl(){
    return this._picUrl;
  }

  get lobbyProfile(){
    return {
      picUrl: this._picUrl,
      status: this._lobbyStatus,
      username: this.username
    };
  }

  set lobbyStatus(status){
    this._lobbyStatus = status;
  }
}
