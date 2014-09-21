// temp WebSocket->Astron bouncer until Astron implements a WebSocket interface
// deprecate/delete this file ASAP
// depends on ws module
// do not bother fixing the long list of bugs in this

var net = require('net');
var ws = require('ws');

var Packet = require("./Packet");

var PROXY_CONTROL_MSGTYPE = 1337;

function Session(ws, astronPort) {
	var that = this;
	
	this.whitelist = [];
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
	
	if(dg.msgtype == PROXY_CONTROL_MSGTYPE) {
		console.log("Control message");
		console.log(JSON.parse(dg.readString()));
	} else {
		if(this.whitelistEnabled && this.whitelist.indexOf(dg.msgtype) == -1) {
			console.log("SECURITY: Admin attempted to send "+dg.msgtype);
		} else {
			this.socket.write(message);	
		}	
	}
		
	if(dg.length + 2 < message.length) {
		this.incomingMessage(msg.slice(dg.length + 2));
	}
}

Session.prototype.enableAll = function() {
	this.whitelistEnabled = false;
}

Session.prototype.enableInternalProtocol = function() {
	this.whitelist.push(9000); // CONTROL_ADD_CHANNEL
}

Session.prototype.enableInspection = function() {
	this.whitelist.push(2102); // STATESERVER_OBJECT_GET_ZONES_OBJECTS
}

Session.prototype.enableManipulation = function() {
	this.whitelist.push(2020); // STATESERVER_OBJECT_SET_FIELD
}


var wss = new (ws.Server)({
	port: 8198
});

wss.on('connection', function(ws) {
	var sess = new Session(ws, 7199);
});