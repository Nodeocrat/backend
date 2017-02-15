'use strict';

var Entity = require('./Entity');

var CircularEntity = class CircularEntity extends Entity
{
    constructor(x, y, speed, radius)
    {
        super(x, y, speed);
        this.radius = radius;
    }
}

module.exports = CircularEntity;
