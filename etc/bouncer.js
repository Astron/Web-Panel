// temp WebSocket->Astron bouncer until Astron implements a WebSocket interface
// deprecate/delete this file ASAP
// depends on ws module
// do not bother fixing the long list of bugs in this

var net = require('net');
var ws = require('ws');

var Packet = require("./Packet");

function Session(ws, astronPort) {
	this.whitelist = [9000, 2102, 2020];
	this.whitelistEnabled = true;

	this.socket = net.connect({
		port: astronPort
	}, function() {
		console.log("Connected to Astron")
	});
	
	this.ws = ws;
	this.ws.on('message', this.incomingMessage);
	
	this.socket.on('data', function(d) {
		this.ws.send(d, {binary: true});
	});
}

Session.prototype.incomingMessage = function(message) {
	dg = new Packet(msg);
	dg.readMDHeader();
	
	console.log("Message type: "+dg.msgtype);
	
	if(this.whitelistEnabled && this.whitelist.indexOf(dg.msgtype) == -1) {
		console.log("SECURITY: Admin attempted to send "+dg.msgtype);
	} else {
		this.socket.write(msg);	
	}
		
	if(dg.length + 2 < msg.length) {
		this.incomingMessage(msg.slice(dg.length + 2));
	}
}


var wss = new (ws.Server)({
	port: 8198
});

wss.on('connection', function(ws) {
	var sess = new Session(ws, 7199);
});