'use strict';

var CircularEntity = require('./CircularEntity');

var Bullet = class Bullet extends CircularEntity
{
    constructor(originator, clickX, clickY)
    {
        super(0, 0, 300, 3);
        this.type = "bullet";
        this.player = originator;

        var theta;
        var diffX = clickX - originator.x;
        var diffY = originator.y - clickY;
        if(diffX >= 0)
            theta = Math.atan( diffY/diffX );
        else
            theta = Math.PI + Math.atan( diffY/diffX );
        this.y = originator.y - (originator.radius)*Math.sin(theta);
        this.x = originator.x + (originator.radius)*Math.cos(theta);
        this.dy = -(this.speed)*Math.sin(theta);
        this.dx = (this.speed)*Math.cos(theta);
    }
}

module.exports = Bullet;
