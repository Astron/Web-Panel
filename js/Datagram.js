// establish a datagram pool for performance reasons
// (and also to work around deficiencies in JavaScript)
// note: this means Datagram is not thread-safe, and does not try to be
// only construct 1 Datagram instance once you have all the needed data

var MAX_DG_SIZE = 0xFFFF;

var dgPoolZero = new Uint8Array(MAX_DG_SIZE+1);
var dgPool = new Uint8Array(MAX_DG_SIZE+1);

function Datagram() {
	dgPool.set(dgPoolZero); // clear any old data
							// TODO: optimize. does this really
							// need to happen for every datagram?
							
	this.buffer = dgPool;
	this.bufferIndex = 2; // reserve room for initial length field which is added on at the end
}

Datagram.prototype.writeUInt8 = function(n) {
	this.buffer[this.bufferIndex++] = n & 0xFF;	
}

Datagram.prototype.writeUInt16 = function(n) {
	this.writeUInt8(n & 0x00FF);
	this.writeUInt8( (n & 0xFF00) >> 8);
}

Datagram.prototype.writeUInt32 = function(n) {
	this.writeUInt16(n & 0x0000FFFF);
	this.writeUInt16( (n & 0xFFFF0000) >> 16);
}

Datagram.prototype.writeUInt64 = function(n) {
	if(typeof n == "number") {
		// this is a normal JavaScript number (32-bit integer that is)
		// no need to implicitly conveert to a UInt64 type
		
		this.writeUInt32(n|0);
		this.writeUInt32(0);
	} else {
		this.writeUInt32(n.low);
		this.writeUInt32(n.high);
	}
}

// TODO: think of faster implementation
// or at least cleaner
Datagram.prototype.writeString = function(str) {
	this.writeUInt16(str.length);
	
	for(var i = 0; i < str.length; ++i) {
		this.writeUInt8(str.charCodeAt(i));
	}
}

Datagram.prototype.writeInternalHeader = function(recipients, msgtype, sender) {
	this.writeUInt8(recipients.length);
	
	for(var i = 0; i < recipients.length; ++i) {
		this.writeUInt64(recipients[i]);
	}
	
	if(sender != undefined) this.writeUInt64(sender);
	
	this.writeUInt16(msgtype);
}

Datagram.prototype.writeControlHeader = function(msgtype) {
	this.writeInternalHeader([1], msgtype);
}

Datagram.prototype.get_data = function() {
	var l  = this.bufferIndex - 2;
	
	this.buffer[0] = l & 0x00FF;
	this.buffer[1] = l & 0xFF00;
	
	return this.buffer.subarray(0, this.bufferIndex); // we don't want to send a 65536 byte packet do we?!
}

// callback is called if the buffer is exhausted but there is more data
function DatagramIterator(buffer, callback) {
	this.callback = callback;
	
	this.size = (buffer[1] << 8) | buffer[0];
	
	this.buffer = buffer;
	this.bufferIndex = 2;
	
	this.isControl = false;
	this.recipients = [];
	this.sender = -1;
	this.msgtype = 0;
	
}

DatagramIterator.prototype.readInternalHeader = function() {	
	var recipient_count = this.readUInt8();
	for(var i = 0; i < recipient_count; ++i) {
		this.recipients.push(this.readUInt64());
	}
	
	if(recipient_count == 1 && this.recipients[0].equals(1)) {
		this.isControl = true;
	} else {
		this.sender = this.readUInt64();
	}
	
	this.msgtype = this.readUInt16();
}

DatagramIterator.prototype.readUInt8 = function() {
	return this.buffer[this.bufferIndex++];
}

DatagramIterator.prototype.readUInt16 = function() {
	return this.readUInt8() | (this.readUInt8() << 8);
}

DatagramIterator.prototype.readUInt32 = function() {
	return this.readUInt16() | (this.readUInt16() << 16);
}

DatagramIterator.prototype.readUInt64 = function() {
	return new UInt64(this.readUInt32(), this.readUInt32());
}

DatagramIterator.prototype.readInt8 = function() {
	return signNetToJS(8, this.readUInt8());
}

DatagramIterator.prototype.readInt16 = function() {
	return signNetToJS(8, this.readUInt16());
}

DatagramIterator.prototype.readInt32 = function() {
	return signNetToJS(8, this.readUInt32());
}

function UInt64(low, high) {
	this.low = low|0;
	this.high = high|0;
}

// this method allows us to type new UInt64(1234, 5678).equals(new UInt64(1234, 5678)) [return true]
UInt64.prototype.equals = function(other) {
	if(typeof other == "number") {
		return (this.low == other) && (this.high == 0);
	}
	
	return (this.low == other.low) && (this.high == other.high);
}

// utility functions for converting JavaScript integers to their two's complement representation
function signNetToJS(bits, num) {
	if(bits == 8 || bits == 16) {
		// sign extend
		if(num >= (1 << (bits-1))) {
			return -( (1 << bits) - num);
		} else {
			return num;
		}
	} else if(bits == 32) {
		return num; // FIXME it's already is signed? WAT
	} else {
		// TODO: figure out how to 64-bit
		console.log("Cannot sign convert value of "+bits+" bits");
		return 0;
	}
}

function signJSToNet(bits, num) {
	if(bits == 8 || bits == 16) {
		// sign extend
		if(num < 0) {
			return (1 << bits) + num;
		} else {
			return num;
		}
	} else if(bits == 32) {
		return num; // FIXME already signed? WAT
	} else {
		console.log("Cannot sign convert value to network ["+bits+" bits]");
		return 0;
	}
}