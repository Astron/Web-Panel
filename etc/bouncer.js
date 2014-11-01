// temp WebSocket->Astron bouncer until Astron implements a WebSocket interface
// deprecate/delete this file ASAP
// depends on ws module
// do not bother fixing the long list of bugs in this

var net = require('net');
var ws = require('ws');
var http = require('http');
var fs = require('fs');
var mime = require('mime');

var Packet = require("./Packet"), OutPacket = require("./OutPacket");

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
		console.log(typeof message);
		that.incomingMessage(message);
	});
	this.ws.on('close', function() {
		that.socket.end();
	})
	
	this.socket.on('data', function(d) {
		that.ws.send(d, {binary: true});
	});
}

Session.prototype.incomingMessage = function(message) {
	dg = new Packet(message);
	dg.readMDHeader();
	
	console.log("Message type: "+dg.msgtype);
	
	if(dg.msgtype == PROXY_CONTROL_MSGTYPE) {
		try {
			var o = JSON.parse(dg.readString());
			
			if(o.type == "login") {
				if(accounts.verifyAccount(o.username, o.password)) {
					accounts.activatePermissions(o.username, this);
					
					this.sendProxyResponse({
						type: "login",
						success: true,
						hasManipulation: accounts.accounts[o.username].permissions.manipulation
					});
				} else {
					this.sendProxyResponse({
						type: "login",
						success: false
					});
				}
			}
		} catch(e) {
			console.error(e);
		}
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

Session.prototype.sendProxyResponse = function(msg) {
	var resp = new OutPacket();
	resp.writeMDHeader([PROXY_CONTROL_MSGTYPE], PROXY_CONTROL_MSGTYPE, PROXY_CONTROL_MSGTYPE);
	resp.writeString(JSON.stringify(msg));
	this.ws.send(resp.serialize())
}

function AccountManager() {
	this.accounts = {};
}

AccountManager.prototype.addAccount = function(name, account) {
	this.accounts[name] = account;
}

AccountManager.prototype.verifyAccount = function(name, pass) {
	if(!this.accounts[name]) return false;
	if(this.accounts[name].password != pass) return false;
	return true;
}

AccountManager.prototype.activatePermissions = function(name, session) {
	var perms = this.accounts[name].permissions;
	
	if(perms.all) {
		session.enableAll();
	} else {
		if(perms.internalProtocol) session.enableInternalProtocol();
		if(perms.inspection) session.enableInspection();
		if(perms.manipulation) session.enableManipulation();
	}
}

function Account(password, permissions) {
	this.password = password;
	this.permissions = permissions;
}

function Permissions(all, internalProtocol, inspection, manipulation) {
	this.all = all;
	this.internalProtocol = internalProtocol;
	this.inspection = inspection;
	this.manipulation = manipulation;
}

var wss = new (ws.Server)({
	port: 8198
});

wss.on('connection', function(ws) {
	var sess = new Session(ws, 7199);
});

var accounts = new AccountManager();
accounts.addAccount("root", new Account("toor", new Permissions(false, true, true, true)));

var whitelistedURL = ["/css/global.css", "/js/Datagram.js", "/js/dcparser.js", "/js/gui.js", "/js/air.js", "/js/global.js", "/js/serializeToken.js", "/index.html", "/simple_example.dc"];

http.createServer(function(req, res) {
	if(whitelistedURL.indexOf(req.url) > -1) {
		fs.readFile('..'+req.url, function(err, data) {
			res.writeHeader(200, {"Content-Type": mime.lookup(req.url)})
			res.end(data);
		})
	} else {
		console.log("Security: "+req.url);
	}
}).listen(8080);