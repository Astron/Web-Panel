// temp WebSocket->Astron bouncer until Astron implements a WebSocket interface
// deprecate/delete this file ASAP
// depends on ws module
// do not bother fixing the long list of bugs in this

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
		astron.write(message);
	});
});	
	
astron.on('data', function(d) {
	console.log("Data from Astron! Passing");
	browser.send(d, {binary: true});
})