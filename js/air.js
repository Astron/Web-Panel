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
	STATESERVER_OBJECT_GET_ZONES_COUNT_RESP: 2113
};

function AstronInternalRepository(debugLevel) {
	this.isConnected = false;
	this.socket = null;
	this.debugLevel = debugLevel || DebugLevel.WARN;
}

AstronInternalRepository.prototype.connect = function(host, port) {
	if(!port) port = 7198;
	this.socket = new WebSocket("ws://"+host+":"+port);
	this.socket.binaryType = "arraybuffer";
	
	// fixes scope errors with JS
	
	var that = this;
	
	this.socket.onopen = function(e) {
		that.connected(e);
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