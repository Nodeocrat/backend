'use strict';

var CircularEntity = require('./CircularEntity');

var Player = class Player extends CircularEntity
{
    constructor(name, picUrl)
    {
        super(395, 395, 100, 10);
        this.name= name;
        this.type = "player";
        this.hit = 0;
        this.picUrl = picUrl || "";
    }
}

module.exports = Player;
