var DebugLevel = {
	SILENCE: 0,
	FATAL: 1,
	ERROR: 2,
	WARN: 3,
	INFO: 4,
	DEBUG: 5,
	TRACE: 6
}

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
}

AstronInternalRepository.prototype.message = function(dg) {
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