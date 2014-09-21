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
	dg = new Packet(msg);
	dg.readMDHeader();
	
	console.log("Message type: "+dg.msgtype);
	
	astron.write(msg);
	
	if(dg.length + 2 < msg.length) {
		parseMessage(msg.slice(dg.length + 2));
	}
}

function Packet(buf){
    this.buf = buf;
    this.offset = 2;
    this.length = this.buf.readUInt16LE(0);
}

Packet.prototype.readUInt8 = function(){ this.offset += 1; if(this.offset-2>=this.length)return 0; return this.buf.readUInt8(this.offset-1); };
Packet.prototype.readUInt16 = function(bypassCheck){ this.offset += 2; if(this.offset-4>=this.length && !bypassCheck)return 0; return this.buf.readUInt16LE(this.offset-2); };
Packet.prototype.readUInt32 = function(){ this.offset += 4; if(this.offset-6>=this.length)return 0; return this.buf.readUInt32LE(this.offset-4); };
Packet.prototype.readUInt64 = function(){ this.offset += 8; if(this.offset-10>=this.length)return 0; return [this.buf.readUInt32LE(this.offset-4), this.buf.readUInt32LE(this.offset-8)]; };

Packet.prototype.readMDHeader = function(){ 
	this.recipient_count = this.readUInt8();
	this.recipients = [];
	
	var i = this.recipient_count;
	while(i){
		this.recipients.push(this.readUInt64());	
		--i;
	}
		
	if(this.recipients.length == 1 && this.recipients[0][0] == 0 && this.recipients[0][1] == 1) {
		// don't read sender, as it's a control packet
	} else {
		this.sender = this.readUInt64();
	}
	
	this.msgtype = this.readUInt16();
};