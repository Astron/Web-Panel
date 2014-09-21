// temp WebSocket->Astron bouncer until Astron implements a WebSocket interface
// deprecate/delete this file ASAP
// depends on ws module
// do not bother fixing the long list of bugs in this

var net = require('net');
var ws = require('ws');

var Packet = require("./Packet");

function Session(ws, astronPort) {
	var that = this;
	
	this.whitelist = [9000, 2102, 2020];
	this.whitelistEnabled = true;

	this.socket = net.connect({
		port: astronPort
	}, function() {
		console.log("Connected to Astron")
	});
	
	this.ws = ws;
	this.ws.on('message', function(message) {
		that.incomingMessage(message);
	});
	
	this.socket.on('data', function(d) {
		that.ws.send(d, {binary: true});
	});
}

Session.prototype.incomingMessage = function(message) {
	dg = new Packet(message);
	dg.readMDHeader();
	
	console.log("Message type: "+dg.msgtype);
	
	if(this.whitelistEnabled && this.whitelist.indexOf(dg.msgtype) == -1) {
		console.log("SECURITY: Admin attempted to send "+dg.msgtype);
	} else {
		this.socket.write(message);	
	}
		
	if(dg.length + 2 < message.length) {
		this.incomingMessage(msg.slice(dg.length + 2));
	}
}


var wss = new (ws.Server)({
	port: 8198
});

wss.on('connection', function(ws) {
	var sess = new Session(ws, 7199);
});