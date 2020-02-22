// Note: This is an old project that turned into something organically, that it was never intended for, so the code is a horrific mess.

module.exports = function(room){

	var playerObj = require('./EntityModel/Player');
	var Bullet = require('./EntityModel/Bullet');

	// Collision table: Literally just a mapping of entity type to a set of entity types which it can collide with
	var collisionTable = { player: { bullet: null },
			       bullet: { player: null }};
	var entToCollIDs = {};


	function cancelCollision(timeoutObj, index, array) {
		clearTimeout(timeoutObj);
	}

	var cancelCollisions = function(entityKey){
		//console.log("cancelling collisions");
		if(!entToCollIDs.hasOwnProperty(entityKey))
			return;

		//console.log(entityKey + " has collisions to cancel");
		entToCollIDs[entityKey].forEach(cancelCollision);
		delete entToCollIDs[entityKey];
	}

	var collision = function(causeEntityKey, destEntityKey){
		var causeEntity = entities[causeEntityKey];
		var destEntity = entities[destEntityKey];
		updateEntity(causeEntityKey);
		updateEntity(destEntityKey);

		if(causeEntity.type == 'bullet')
		{
			if(destEntity.radius > 1)
			{
				causeEntity.player.radius++;
				destEntity.radius--;
			}
			cancelCollisions(causeEntityKey);
			delete entities[causeEntityKey];
			delete entityTypes.bullet[causeEntityKey];
			delete playerInfo[causeEntityKey];
		}
		else // causeEntity is the 'victim'
		{
			if(causeEntity.radius > 1)
			{
				causeEntity.radius--;
				destEntity.player.radius++;
			}
			cancelCollisions(destEntityKey);
			delete entities[destEntityKey];
			delete entityTypes.bullet[destEntityKey];
			delete playerInfo[destEntityKey];
		}
		room.broadcast('collision', {entityKey:causeEntityKey, destKey:destEntityKey});
	};

	var checkForCollisions = function(causeEntityKey, causeEntity, entitiesToSkipCheck){

		for(var entityProperty in entities)
		{
			var entity = entities[entityProperty];
			// if we're dealing with a bullet, only check it against players.
			if((!collisionTable[causeEntity.type].hasOwnProperty(entity.type)) || entitiesToSkipCheck.hasOwnProperty(entityProperty))
				continue;

	    //console.log("[CheckForCollision]: " + JSON.stringify(entity, null, 4));
			updateEntity(entityProperty);
			testForCollision(causeEntityKey, causeEntity, entityProperty, entity);
		}
	}

	var testForCollision = function(causeEntityKey, causeEntity, destEntityKey, destEntity)
	{
		var collX;
		var collY;
		var collT;

		var x1 = causeEntity.x;
		var y1 = -causeEntity.y;
		var x2 = destEntity.x;
		var y2 = -destEntity.y;
		var r = causeEntity.radius + destEntity.radius; //radius
		var dx1 = (causeEntity.dx)/1000;
		var dy1 = -(causeEntity.dy)/1000;
		var dx2 = (destEntity.dx)/1000;
		var dy2 = -(destEntity.dy)/1000;

		if(dx1 == 0 && dx2 == 0 && dy1 == 0 && dy2 == 0)
			return;

		var A = (dx1-dx2)**2 + (dy1-dy2)**2;
		var B = 2*(dx1-dx2)*(x1-x2) + 2*(dy1-dy2)*(y1-y2);
		var C = (x1-x2)**2 + (y1-y2)**2 - r**2;
		var det = B**2 - 4*A*C;
		if(det < 0)
			return;

		collT = (-B - Math.sqrt(det))/(2*A);
		if(collT < 0)
			return;
		collX = x1 + collT*dx1;
		collY = y1 + collT*dy1;

		/*console.log("\n\n"
			+ "\nx1: " + x1
			+ "\ny1: " + y1
			+ "\nx2: " + x2
			+ "\ny2: " + y2
			+ "\nr: " + r
			+ "\ndx1: " + dx1
			+ "\ndy1: " + dy1
			+ "\ndx2: " + dx2
			+ "\ndy2: " + dy2
			+ "\nA: " + A
			+ "\nB: " + B
			+ "\nC: " + C
			+ "\ndet: " + det
			+ "\ncollT: " + collT
			+ "\ncollX: " + collX
			+ "\ncollY: " + collY
			);*/


		var collID = setTimeout(collision, collT, causeEntityKey, destEntityKey);
		if(!entToCollIDs.hasOwnProperty(causeEntityKey))
			entToCollIDs[causeEntityKey] = [collID];
		else
			entToCollIDs[causeEntityKey].push(collID);

		if(!entToCollIDs.hasOwnProperty(destEntityKey))
			entToCollIDs[destEntityKey] = [collID];
		else
			entToCollIDs[destEntityKey].push(collID);
	};
	//**********************************************
	// GAME WORLD TO GO IN SEPARATE MODULE

	// Entity design: entities hold all the entityKey: entity pairs, whilst entityTypes holds entityType: entityKeys, where entityKeys is a Set.
	var entities = {};
	var entityTypes = { player: {},
			    bullet: {}};

	// some info about each player for the server only:
	// maps player usernames to additional info in format: {bulletNo, lastUpdated, list of collisions, log}
	var playerInfo = {};

	var canvasHeight = 800;
	var canvasWidth = 800;

	var updateEntity = function(entityKey){
		// could pass a time through to perfectly synchronize 2+ entities, if undefined, carry on this way...

	  var entity = entities[entityKey];
		var multiplier;
		if(!playerInfo[entityKey])
			return;
		if(playerInfo[entityKey].lastUpdated === undefined)
		{
			multiplier = 0.0167;
		} else {
			var diff = process.hrtime(playerInfo[entityKey].lastUpdated);
			var deltaTimeNs = diff[0] * 1e9 + diff[1];
			multiplier = deltaTimeNs/1000000000;
		}

		entity.y += multiplier*(entity.dy);
		entity.x += multiplier*(entity.dx);
		playerInfo[entityKey].lastUpdated = process.hrtime();

		if(entity.type === 'bullet'){

					if(entity.x < 0 || entity.x > canvasWidth || entity.y < 0 || entity.y > canvasHeight){
						cancelCollisions(entityKey);
						delete entities[entityKey];
						delete entityTypes.bullet[entityKey];
						delete playerInfo[entityKey];
					}
		}

		//checks/validation
		if(entity.x > canvasWidth)
			entity.x = canvasWidth;
		else if (entity.x < 0)
			entity.x = 0;

		if(entity.y > canvasHeight)
			entity.y = canvasHeight;
		else if(entity.y < 0)
			entity.y = 0;

	}

	//**********************************************
	const leave = client => {
		const username = client.id;
		const socket = client.socket;

		console.log(`shooty-balls-app.js: ${username} left`);

		if(!entities[username])
			return;
		delete entities[username];
		delete entityTypes.player[username];
		delete playerInfo[username];
		// Cancel any collisions they are potentially involved in
		cancelCollisions(username);

		room.broadcast('player left', username);
	}
	const join = function(client){
		var username = client.id;
		var addr = client.ip;
		console.log(`shooty-balls-app: ${username} joined game`);

		var player;

		room.addListener(client, 'move left', function(){
			cancelCollisions(username);
			updateEntity(username);

			if(player.dy != 0)
			{
				player.dx = -Math.sqrt(0.5*(player.speed)*(player.speed));
				player.dy = Math.sqrt(0.5*(player.speed)*(player.speed))*( (player.dy) / Math.abs(player.dy) );
			}
			else
			{
				player.dx = -player.speed;
			}

			checkForCollisions(username, player, {});
			room.broadcast('move left', username);
		});
		room.addListener(client, 'stop move left', function(){
			cancelCollisions(username);
			updateEntity(username);
			if(player.dy != 0)
				player.dy = (player.speed)*( (player.dy) / Math.abs(player.dy) );
			player.dx = 0;
			checkForCollisions(username, player, {});
			room.broadcast('stop move left', {playerId:username, atX:player.x, atY:player.y});
		});
		room.addListener(client, 'move right', function(){
			cancelCollisions(username);
			updateEntity(username);

			if(player.dy != 0)
			{
				player.dx = Math.sqrt(0.5*(player.speed)*(player.speed));
				player.dy = Math.sqrt(0.5*(player.speed)*(player.speed))*( (player.dy) / Math.abs(player.dy) );
			}
			else
			{
				player.dx = player.speed;
			}

			checkForCollisions(username, player, {});
			room.broadcast('move right', username);
		});
		room.addListener(client, 'stop move right', function(){
			cancelCollisions(username);
			updateEntity(username);
			if(player.dy != 0)
				player.dy = (player.speed)*( (player.dy) / Math.abs(player.dy) );
			player.dx = 0;
			checkForCollisions(username, player, {});
			room.broadcast('stop move right', {playerId:username, atX:player.x, atY:player.y});
		});
		room.addListener(client, 'move up', function(){
			cancelCollisions(username);
			updateEntity(username);

			if(player.dx != 0)
			{
				player.dy = -Math.sqrt(0.5*(player.speed)*(player.speed));
				player.dx = Math.sqrt(0.5*(player.speed)*(player.speed))*( (player.dx) / Math.abs(player.dx) );
			}
			else
			{
				player.dy = -player.speed;
			}

			checkForCollisions(username, player, {});
			room.broadcast('move up', username);
		});
		room.addListener(client, 'stop move up', function(){
			cancelCollisions(username);
			updateEntity(username);
			if(player.dx != 0)
				player.dx = (player.speed)*( (player.dx) / Math.abs(player.dx) );
			player.dy = 0;
			checkForCollisions(username, player, {});
			room.broadcast('stop move up', {playerId:username, atX:player.x, atY:player.y});
		});
		room.addListener(client, 'move down', function(){
			cancelCollisions(username);
			updateEntity(username);

			if(player.dx != 0)
			{
				player.dy = Math.sqrt(0.5*(player.speed)*(player.speed));
				player.dx = Math.sqrt(0.5*(player.speed)*(player.speed))*( (player.dx) / Math.abs(player.dx) );
			}
			else
			{
				player.dy = player.speed;
			}

			checkForCollisions(username, player, {});
			room.broadcast('move down', username);
		});
		room.addListener(client, 'stop move down', function(){
			cancelCollisions(username);
			updateEntity(username);
			if(player.dx != 0)
				player.dx = (player.speed)*( (player.dx) / Math.abs(player.dx) );
			player.dy = 0;
			checkForCollisions(username, player, {});
			room.broadcast('stop move down', {playerId:username, atX:player.x, atY:player.y});
		});
		room.addListener(client, 'player shot', function({x, y}){
			//TODO VALIDATION NEEDED!!!
			updateEntity(username);
			var entityKey = "bullet|" + username + "|" + playerInfo[username].bulletNo;
			room.broadcast('player shot',
				{
					bulletKey: entityKey,
					originatorKey: username,
					clickX: x,
					clickY: y
				}
			);
			playerInfo[username].bulletNo++;
			var newBullet = new Bullet(player, x, y);

			// Must skip self when checking for collisions
			var entitiesToSkipCheck = {};
			entitiesToSkipCheck[username] = null;

			checkForCollisions(entityKey, newBullet, entitiesToSkipCheck);
			entities[entityKey] = newBullet;
			entityTypes.bullet[entityKey] = null;
	        playerInfo[entityKey] = {lastUpdated: process.hrtime()};
		});

		// Initiate player and announce new player has joined to current participants
		entities[username] = new playerObj(username);
		player = entities[username];
		//if (addr == "127.0.0.1"){ player.speed =  300; }
		entityTypes.player[username] = null;
		playerInfo[username] = {bulletNo: 0, lastUpdated: process.hrtime()};
		room.broadcast('player joined', player);
		room.emit(client, 'START', {entitiesOnServer: entities, myNameOnServer: username});
	};

	//memory leak test
	/*setInterval(() => {
		console.log('\n\nentToCollIDs: ' + Object.keys(entToCollIDs).length
							+ '\nentities: ' + Object.keys(entities).length
							+ '\nentityTypes.player: ' + Object.keys(entityTypes.player).length
						  + '\nentityTypes.bullet: ' + Object.keys(entityTypes.bullet).length
						  + '\nplayerInfo: ' + Object.keys(playerInfo).length);
	}, 3000);*/

	setInterval(() => {
		Object.keys(entityTypes.bullet).forEach((bulletKey) => {
			updateEntity(bulletKey);
		});
	}, 10000);

	console.log(`NodeShooter instance ${room.id} started`);

	// External API
	return {join, leave};
}
