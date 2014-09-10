// callback is called if the buffer is exhausted but there is more data
function DatagramIterator(buffer, callback) {
	this.callback = callback;
	
	this.size = (buffer[1] << 8) | buffer[0];
	
	this.buffer = buffer;
	this.bufferIndex = 0;
}

DatagramIterator.prototype.readUInt8 = function() {
	return this.buffer[this.bufferIndex++];
}

DatagramIterator.prototype.readUInt16 = function() {
	return (this.readUInt8() << 8) | this.readUInt8();
}

DatagramIterator.prototype.readUInt32 = function() {
	return (this.readUInt16() << 16) | this.readUInt16();
}

DatagramIterator.prototype.readUInt64 = function() {
	return (this.readUInt32() << 32) | this.readUInt32();
}