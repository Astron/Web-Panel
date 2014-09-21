function OutPacket(){
    this.buf = [];
}
OutPacket.prototype.writeUInt8 = function(b){ this.buf.push(b & 0xFF); };
OutPacket.prototype.writeUInt16 = function(b){ this.writeUInt8(b & 0xFF); this.writeUInt8((b >> 8) & 0xFF); };
OutPacket.prototype.writeUInt32 = function(b){ this.writeUInt16(b & 0xFFFF); this.writeUInt16((b >> 16) & 0xFFFF); };
OutPacket.prototype.writeUInt64 = function(b){ b = bignum(b);  this.writeUInt32(b.and(0xFFFFFFFF)); this.writeUInt32(b.shiftRight(32));  };
OutPacket.prototype.writeBlob = function(b,l){ var i = 0; while(i < l){ this.buf.push(b[i].charCodeAt(0)); ++i; }; };
OutPacket.prototype.writeString = function(str){ this.writeUInt16(str.length); this.writeBlob(str,str.length);};

OutPacket.prototype.writeMDHeader = function(recipients, msgtype, sender){
	if(!Array.isArray(recipients)) recipients = [recipients];
    
    console.log(recipients);
    
    this.writeUInt8(recipients.length);
	var i = 0;
	while(i < recipients.length){
		this.writeUInt64(recipients[i++]);
	}
	if(sender) this.writeUInt64(sender);
	this.writeUInt16(msgtype);
};

OutPacket.prototype.serialize = function(){ var l = this.buf.length; return new Buffer([l & 0xFF, (l >> 8) & 0xFF].concat(this.buf));  };

module.exports = OutPacket;
