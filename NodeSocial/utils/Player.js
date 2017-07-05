module.exports = class Player {
  constructor(user, socket, ops = {}){
    this._socket = socket;
    this._ip = socket.request.connection.remoteAddress;
    this._username = user.username;
    this._picUrl = user.displayPicture.value;
    this._status = ops.status || 'OFFLINE';
    this._rooms = new Map();

    //bindings
    this.addRoom = this.addRoom.bind(this);
    this.removeRoom = this.removeRoom.bind(this);
    this.in = this.in.bind(this);
  }

  addRoom(room){
    this._rooms.set(room.roomId, room);
  }

  removeRoom(room){
    this._rooms.delete(room.roomId);
  }

  in(inputRoom){
    const room = this._rooms.get(inputRoom.roomId);
    if(room)
      return true;
    else
      return false;
  }

  leaveAllRooms(){
    console.log(`${this.username} leaving all rooms`);
    for(let [roomId, room] of this._rooms)
      room.leave(this);
    this._rooms.clear();
  }

  get id(){
    return this.username;
  }

  get username(){
    return this._username;
  }

  get ip(){
    return this._ip;
  }

  get socket(){
    return this._socket;
  }

  get status(){
    return this._status;
  }

  set status(status){
    this._status = status;
  }

  get publicProfile(){
    return {
      username: this.username,
      picUrl: this._picUrl,
      status: this.status
    };
  }
}
