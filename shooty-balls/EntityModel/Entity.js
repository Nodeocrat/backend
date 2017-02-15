'use strict';

// Entity class. Every scene object inherits from this.
var Entity = class
{
    constructor(x, y, speed)
    {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.dx = 0;
        this.dy = 0;
        this.writable = true;
        this.type = null;
    }
}

module.exports = Entity;
