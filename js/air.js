var DebugLevel = {
	SILENCE: 0,
	FATAL: 1,
	ERROR: 2,
	WARN: 3,
	INFO: 4,
	DEBUG: 5,
	TRACE: 6
}

var packets = {
	STATESERVER_OBJECT_SET_FIELD: 2020,
	STATESERVER_OBJECT_GET_ZONES_COUNT_RESP: 2113,
	STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED: 2042,
	STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED_OTHER: 2043,
	STATESERVER_OBJECT_GET_ALL: 2014,
	STATESERVER_OBJECT_GET_ALL_RESP: 2015,
	STATESERVER_GET_ACTIVE_ZONES: 2125,
	STATESERVER_GET_ACTIVE_ZONES_RESP: 2126
};

function AstronInternalRepository(debugLevel, dcFilePath) {
	this.isConnected = false;
	this.socket = null;
	this.debugLevel = debugLevel || DebugLevel.WARN;
	
	this.dcFileLoaded = false;
	this.dcFile = null;
	
	this.doId2do = {};
	
	this.contexts = {};
	this.contextCounter = 0;
	
	this.enterObjectCallback = function(){};
	this.authCallback = function(){};
}

AstronInternalRepository.prototype.connect = function(host, port, dcFile, connectedCallback) {
	if(!port) port = 7198;
	
	// fixes scope errors with JS
	
	var that = this;
	
	// in order to prevent a potential race condition,
	// we fetch the DC file before connecting to the server
	
	fetchDCFile(dcFile, function(success, result) {
		
		if(success) {
			that.dcFileLoaded = true;
			that.dcFile = result;
			
			that.socket = new WebSocket("ws://"+host+":"+port);
			that.socket.binaryType = "arraybuffer";
			
			that.socket.onopen = function(e) {		
				that.connected(e);
				connectedCallback();
			};
	
			that.socket.onmessage = function(e) {
				that.incomingMessage(new Uint8Array(e.data));
			}
			
		} else {
			// something went wrong
			// most likely a violation of the same-origin policy
			
			console.error("DC loading error. Check relevant browser logs for possible same-origin policy violations");
		}
		
	});
	
	
	console.log("Connecting");
}

AstronInternalRepository.prototype.incomingMessage = function(msg) {
	this.message(new DatagramIterator(msg, this.incomingMessage.bind(this)));
}

AstronInternalRepository.prototype.connected = function(e) {
	this.isConnected = true;
	this.log(DebugLevel.INFO, "Connected to Astron");
	this.airId = 1337;	
	
}

AstronInternalRepository.prototype.message = function(dg) {
	dg.readInternalHeader();
	
	if(dg.msgtype == packets.STATESERVER_OBJECT_GET_ZONES_COUNT_RESP) {
		var context = dg.readUInt32();
		var object_count = dg.readUInt32();
		
		// callback function(object_count)
		this.rpcResponse(context, [object_count]);
	} else if(dg.msgtype == packets.STATESERVER_OBJECT_GET_ALL_RESP) {
		var context = dg.readUInt32();
		var doId = dg.readUInt32();
		var parentId = dg.readUInt32();
		var zone = dg.readUInt32();
		var dclassId = dg.readUInt16();
				
		var properties = this.readProperties(dg, this.dcFile.DCFile[dclassId], [], true);
		
		var distObj = new DistributedObject(this.dcFile.DCFile[dclassId], doId, new Location(parentId, zone), properties)
		this.doId2do[doId] = distObj; // oh javascript
		
		// callback function(distributed_object)
		this.rpcResponse(context, [distObj]); 
	} else if(dg.msgtype == packets.STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED) {
		this.handleEnterObject(dg, ["broadcast"], false);
	} else if(dg.msgtype == packets.STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED_OTHER) {
		this.handleEnterObject(dg, ["broadcast"], true)
	} else if(dg.msgtype == 1337) {
		// proxy response
		var resp = JSON.parse(dg.readString());
		
		if(resp.type == "login") {
			this.subscribeChannel(this.airId);
			
			this.authCallback(resp.success, resp);
		} else {
			console.log("Unknown proxy message: "+resp.type);
			console.log(resp);
		}
	} else if(dg.msgtype == packets.STATESERVER_GET_ACTIVE_ZONES_RESP) {
		var context = dg.readUInt32();
		var zone_count = dg.readUInt16();
				
		var zones = [];
		for(var i = 0; i < zone_count; ++i) {
			zones.push(dg.readUInt32());
		}
		
		console.log(dg);
		
		this.rpcResponse(context, [dg.sender.low, zones]);
	} else {
		console.log("Unknown packet of msgtype "+dg.msgtype+" received");
	}
	
	dg.eof();
	
	console.log(dg);
}

AstronInternalRepository.prototype.log = function(level, message) {
	if(this.debugLevel >= level) {
		console.log(message);
	}
}

AstronInternalRepository.prototype.send = function(dg) {
	this.socket.send(dg.get_data());
}

AstronInternalRepository.prototype.nextContext = function() {
	return this.contextCounter++;
}

AstronInternalRepository.prototype.rpcContext = function(callback) {
	var ctx = this.nextContext();
	
	this.contexts[ctx] = callback;
	return ctx;
}

AstronInternalRepository.prototype.rpcResponse = function(context, parameters) {
	this.contexts[context].apply(null, parameters);
	this.contexts[context] = null;
}

// packet serialization utilities

AstronInternalRepository.prototype.proxyMessage = function(msg) {
	var dg = new Datagram();
	dg.writeControlHeader(1337);
	dg.writeString(JSON.stringify(msg));
	this.send(dg);
}

AstronInternalRepository.prototype.authenticate = function(username, password) {
	this.proxyMessage({
		type: "login",
		username: username,
		password: password
	});
}

AstronInternalRepository.prototype.subscribeChannel = function(channel) {
	var dg = new Datagram();
	dg.writeControlHeader(9000);
	dg.writeUInt64(channel);
	this.send(dg);
}

AstronInternalRepository.prototype.setConName = function(name) {
	var dg = new Datagram();
	dg.writeControlHeader(9012);
	dg.writeString(name);
	this.send(dg);
}

AstronInternalRepository.prototype.getZones = function(context, t_parent) {
	var dg = new Datagram();
	dg.writeInternalHeader([t_parent], packets.STATESERVER_GET_ACTIVE_ZONES, this.airId);
	dg.writeContext(this, context);
	this.send(dg);
}

AstronInternalRepository.prototype.getZonesObjects = function(context, t_parent, zones) {
	for(var z = 0; z < zones.length; ++z) {
		this.subscribeChannel(zones[z]);
	}
	
	var dg = new Datagram();
	dg.writeInternalHeader([t_parent], 2102, this.airId);
	dg.writeContext(this, context);
	dg.writeUInt32(t_parent);
	dg.writeUInt16(zones.length);
	
	for(var i = 0; i < zones.length; ++i) {
		dg.writeUInt32(zones[i]);
	}
	
	this.send(dg);
}

AstronInternalRepository.prototype.setField = function(distributedObject, fieldName, value) {
	var fieldId = this.dcFile.reverseFieldLookup[distributedObject.dclass[1]+"::"+fieldName];
	var types = this.dcFile.fieldLookup[fieldId][4];
	
	var dg = new Datagram();
	dg.writeInternalHeader([distributedObject.doId], packets.STATESERVER_OBJECT_SET_FIELD, this.airId);
	dg.writeUInt32(distributedObject.doId);
	dg.writeUInt16(fieldId);
	
	for(var i = 0; i < types.length; ++i) {
		serializeToken(this.dcFile, dg, types[i], value[i]);
	}
	
	this.send(dg);
}

AstronInternalRepository.prototype.getFields = function(context, distObj) {
	var dg = new Datagram();
	dg.writeInternalHeader([distObj.doId], packets.STATESERVER_OBJECT_GET_ALL, this.airId);
	dg.writeContext(this, context);
	dg.writeUInt32(distObj.doId);
	this.send(dg);
}

// packet handling methods

AstronInternalRepository.prototype.handleEnterObject = function(dg, requiredModifiers, optionals) {	
	var doId = dg.readUInt32();
	var location = new Location(dg.readUInt32(), dg.readUInt32());
			
	var dclassId = dg.readUInt16();
	var t_dclass = this.dcFile.DCFile[dclassId];
	
	var values = this.readProperties(dg, t_dclass, requiredModifiers, optionals);
	
	var distObj = new DistributedObject(t_dclass, doId, location, values);
	this.doId2do[doId] = distObj;
	
	if(this.doId2do[location.parent]) {
		if(!this.doId2do[location.parent].zones[location.zone]) {
			this.doId2do[location.parent].zones[location.zone] = [];
		}
		
		this.doId2do[location.parent].zones[location.zone].push(doId);
	}
	
	this.enterObjectCallback(distObj);
	
	console.log(distObj.dclass[1]+"("+doId+") at ("+distObj.location.parent+","+distObj.location.zone+")");
	console.log(distObj.properties);
}

AstronInternalRepository.prototype.readProperties = function(dg, t_dclass, requiredModifiers, optionals) {
	if(!requiredModifiers) requiredModifiers = [];
	requiredModifiers.push("required");
	
	var fields = t_dclass[2];
	var values = {};
	
	console.log(fields);
	
	nextField: for(var i = 0; i < fields.length; ++i) {
		var modifiers = fields[i][2];
		for(var f = 0; f < requiredModifiers.length; ++f) {
			if(modifiers.indexOf(requiredModifiers[f]) == -1) {
				// all modifiers MUST be present
				continue nextField;
			}
		}
		
		var val = [];
		
		for(var v = 0; v < fields[i][3].length; ++v) {
			val.push(unserializeToken(this.dcFile, dg, fields[i][3][v]))
		}
		
		values[fields[i][1]] = val;
	}
	
	if(optionals) {
		var num_optionals = dg.readUInt16();
		
		console.log(num_optionals);
		
		for(var i = 0; i < num_optionals; ++i) {
			var field_id = dg.readUInt16();
			var field = this.dcFile.fieldLookup[field_id];
			
			var vals = [];
			for(var v = 0; v < field[4].length; ++v) {
				vals.push(unserializeToken(this.dcFile, dg, field[4][v]));
			}
			
			values[field[2]] = vals;
		}
	}
	
	return values;
}

function Location(parent, zone) {
	this.parent = parent;
	this.zone = zone;
}

function DistributedObject(dclass, doId, location, properties) {
	this.dclass = dclass;
	this.doId = doId;
	this.location = location;
	this.properties = properties || {};
	this.zones = {};
}