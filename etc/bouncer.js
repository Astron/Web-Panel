// temp WebSocket->Astron bouncer until Astron implements a WebSocket interface
// deprecate/delete this file ASAP
// depends on ws module
// do not bother fixing the long list of bugs in this

var Packet = require("./Packet");

var whitelist = [9000, 2102, 2020], whitelistEnabled = true;

var net = require('net');
var ws = require('ws');

var astron = net.connect({port: 7199},
	function() {
		console.log("Connection to Astron established");
	});
	
var wss = new (ws.Server)({
	port: 8198
});

var browser;

wss.on('connection', function(ws) {
	browser = ws;
	
	ws.on('message', function(message) {
		parseMessage(message);
	});
});	
	
astron.on('data', function(d) {
	console.log("Data from Astron! Passing");
	browser.send(d, {binary: true});
})

function parseMessage(msg) {
	dg = new Packet(msg);
	dg.readMDHeader();
	
	console.log("Message type: "+dg.msgtype);
	
	if(whitelistEnabled && whitelist.indexOf(dg.msgtype) == -1) {
		console.log("SECURITY: Admin attempted to send "+dg.msgtype);
	} else {
		astron.write(msg);	
	}
		
	if(dg.length + 2 < msg.length) {
		parseMessage(msg.slice(dg.length + 2));
	}
}