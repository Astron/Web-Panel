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
	STATESERVER_OBJECT_GET_ZONES_COUNT_RESP: 2113,
	STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED: 2042
};

function AstronInternalRepository(debugLevel, dcFilePath) {
	this.isConnected = false;
	this.socket = null;
	this.debugLevel = debugLevel || DebugLevel.WARN;
	
	this.dcFileLoaded = false;
	this.dcFile = null;
}

AstronInternalRepository.prototype.connect = function(host, port, dcFile) {
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
	
	this.subscribeChannel(1337);
}

AstronInternalRepository.prototype.message = function(dg) {
	dg.readInternalHeader();
	
	if(dg.msgtype == packets.STATESERVER_OBJECT_GET_ZONES_COUNT_RESP) {
		var context = dg.readUInt32();
		var object_count = dg.readUInt32();
		
		console.log(context);
		console.log(object_count);
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

// packet handling methods

// TODO: in the future, this needs to handle, e.g.: optionals, owner, etc.
AstronInternalRepository.prototype.handleEnterObject = function(dg, requiredFields) {
	var doId = dg.readUInt32();
	var location = new Location(dg.readUInt32(), dg.readUInt32());
			
	var dclassId = dg.readUInt16();
	var t_dclass = this.dcFile.DCFile[dclassId];
	
	console.log(t_dclass[1]+"("+doId+") at ("+location.parent+","+location.zone+")");
	console.log(t_dclass);
}

function Location(parent, zone) {
	this.parent = parent;
	this.zone = zone;
}