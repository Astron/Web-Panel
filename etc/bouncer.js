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
		parseMessage(message);
	});
});	
	
astron.on('data', function(d) {
	console.log("Data from Astron! Passing");
	browser.send(d, {binary: true});
})

function parseMessage(msg) {
	var header = getMsgHeader(msg);
	
	console.log("Message type: "+header.msgtype);
	
	astron.write(msg);
	
	if(header.length + 2 < msg.length) {
		parseMessage(msg.slice(header.length + 2));
	}
}

function getMsgHeader(dg) {
	var header = {
		length: (dg[1] << 8) | dg[0],
		recipient_count: dg[2],
		isControl: false
	};
	
	if(header.recipient_count == 1) {
		if(dg[3] == 1 && dg[4] == 0 && dg[5] == 0 && dg[6] == 0 && dg[7] == 0 && dg[8] == 0 && dg[9] == 0 && dg[10] == 0) {
			header.isControl = true;
		}
	}
	
	msgtypeOffset = 3 + (8 * header.recipient_count) + (header.isControl ? 0 : 8);
	
	header.msgtype = (dg[msgtypeOffset + 1] << 8) | dg[msgtypeOffset];
	
	return header;
}