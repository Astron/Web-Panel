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
	STATESERVER_OBJECT_GET_ALL: 2014,
	STATESERVER_OBJECT_GET_ALL_RESP: 2015
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
}

AstronInternalRepository.prototype.connect = function(host, port, dcFile, connectedCallback) {
	if(!port) port = 7198;
	this.socket = new WebSocket("ws://"+host+":"+port);
	this.socket.binaryType = "arraybuffer";
	
	// fixes scope errors with JS
	
	var that = this;
	
	this.socket.onopen = function(e) {
		// before we can officially declare ourselves connected to the server,
		// we have to fetch the DC file from the server
		// TODO: research if this will cause a race condition
		
		fetchDCFile(dcFile, function(success, result) {
			
			if(success) {
				that.dcFileLoaded = true;
				that.dcFile = result;
				
				that.connected(e);
				connectedCallback();
			} else {
				// something went wrong
				// most likely a violation of the same-origin policy
				
				console.error("DC loading error. Check relevant browser logs for possible same-origin policy violations");
			}
			
		});
	};
	
	this.socket.onmessage = function(e) {
		console.log("Incoming");
		that.message(new DatagramIterator(new Uint8Array(e.data)));
	}
	
	console.log("Connecting");
}

AstronInternalRepository.prototype.connected = function(e) {
	this.isConnected = true;
	this.log(DebugLevel.INFO, "Connected to Astron");
	this.airId = 1337;
	
	this.subscribeChannel(this.airId);
	
	
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
		var dclassId = dg.readUInt32();
		
		var properties = this.readProperties(dg, this.dcFile.DCFile[dclassId], [], true);
		console.log(properties);
		
		this.rpcResponse(context, []); 
	} else if(dg.msgtype == packets.STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED) {
		this.handleEnterObject(dg, ["broadcast"]);
	} else {
		console.log("Unknown packet of msgtype "+dg.msgtype+" received");
	}
	
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
	this.contexts[this.nextContext()] = callback;
}

AstronInternalRepository.prototype.rpcResponse = function(context, parameters) {
	this.contexts[context].apply(null, parameters);
	this.contexts[context] = null;
}

// packet serialization utilities

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

AstronInternalRepository.prototype.getZonesObjects = function(context, t_parent, zones) {
	for(var z = 0; z < zones.length; ++z) {
		this.subscribeChannel(zones[z]);
	}
	
	var dg = new Datagram();
	dg.writeInternalHeader([t_parent], 2102, this.airId);
	dg.writeUInt32(context);
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
	dg.writeUInt32(context);
	dg.writeUInt32(distObj.doId);
	this.send(dg);
}

// packet handling methods

// TODO: in the future, this needs to handle, e.g.: optionals, owner, etc.
AstronInternalRepository.prototype.handleEnterObject = function(dg, requiredModifiers, optionals) {
	if(!requiredModifiers) requiredModifiers = [];
	requiredModifiers.push("required");
	
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
	
	console.log(distObj.dclass[1]+"("+doId+") at ("+distObj.location.parent+","+distObj.location.zone+")");
	console.log(distObj.properties);
}

AstronInternalRepository.prototype.readProperties = function(dg, t_dclass, requiredModifiers, optionals) {
	var fields = t_dclass[2];
	var values = {};
	
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
		var num_optinals = dg.readUInt16();
		
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