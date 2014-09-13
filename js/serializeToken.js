function typeLen(DCFile, type, value) {
    if(DCFile.typedefs[type]) type = DCFile.typedefs[type]; // resolve typedefs

    if((type.indexOf("int") > -1)  && !Array.isArray(value)){
        var range = type.split('(');
        type = range[0];
        var type_p = type.split("%");
        value *= type_p[0].split("/")[1] ? type_p[0].split("/")[1] : 1;
        if(type_p[1]) value *= type_p[1].split("/")[1] ? type_p[1].split("/")[1] : 1;  
        type = type_p[0];
        type = type.split('/')[0].split('%')[0];
    }

    type = type.trim();
	
	
	if(type == 'string' || type == 'blob') {
		return 2 + value.length;
	} else if(type == 'char' || type == 'uint8' || type == 'int8') {
		return 1;
	} else if(type == 'int16' || type == 'uint16') {
		return 2;
	} else if(type == 'int32' || type == 'uint32') {
		return 4;
	} else if(type == 'int64' || type == 'uint64') {
		return 8;
	} else if(DCFile.classLookup[type]) {
		console.log("How would one determine this type?");
	} else if(DCFile.structLookup[type]) {
		var struct = DCFile.DCFile[DCFile.structLookup[type]];
	
		var len = 0;
	
		for(var i = 0; i < struct[2].length; ++i) {
			len += typeLen(DCFile, struct[2][i][0], value[struct[2][i][1]]);
		}
		
		return len;
	}
}

function serializeToken(DCFile, out, type, val){
    type = type.trim();

    if(type[type.length-1] == ']') { // arrays have there own little implementation
        // array type
        
        var dynArray = type[type.length-2] == '[';
        if(dynArray){ // extract type
            
            type = type.slice(0,-3);
            var len = 0;
			
			for(var i = 0; i < val.length; ++i) {
				len += typeLen(DCFile, type, val[i])
			}
			
            out.writeUInt16(len);
            
        } else {
            var tparts = type.split(' ');
            len = tparts[1].slice(1, -1);
            if(len.indexOf("-") > -1){
	            var len = 0;
			
				for(var i = 0; i < val.length; ++i) {
					len += typeLen(DCFile, type, val[i])
				}
			
	            out.writeUInt16(len);
            }
            type = tparts[0];
        }
        
        for(var y=0; y < val.length; y++){
            serializeToken(out, type, val[y]);
        }
        return;
    }
    
    if(DCFile.typedefs[type]) type = DCFile.typedefs[type]; // resolve typedefs
    
    if((type.indexOf("int") > -1)  && !Array.isArray(val)){
        var range = type.split('(');
        type = range[0];
        var type_p = type.split("%");
        val *= type_p[0].split("/")[1] ? type_p[0].split("/")[1] : 1;
        if(type_p[1]) val *= type_p[1].split("/")[1] ? type_p[1].split("/")[1] : 1;  
        type = type_p[0];
        type = type.split('/')[0].split('%')[0];
    }
    
    type = type.trim();
    
         if(type == 'string')   out.writeString(val);
    else if(type == 'blob')     out.writeArray(val, val.length);
    
    else if(type == 'char')     out.writeUInt8(val.charCodeAt(0));
    
    else if(type == 'int8')    out.writeInt8(val);
    else if(type == 'int16')   out.writeInt16(val);
    else if(type == 'int32')   out.writeInt32(val);
    else if(type == 'int64')   out.writeInt64(val);
    else if(type == 'uint8')    out.writeUInt8(val);
    else if(type == 'uint16')   out.writeUInt16(val);
    else if(type == 'uint32')   out.writeUInt32(val);
    else if(type == 'uint64')   out.writeUInt64(val);
    
    else if(type == 'uint8array') out.writeUInt8Array(val);
    else if(type == 'uint16array') out.writeUInt16Array(val);
    else if(type == 'uint32array') out.writeUInt32Array(val);
    else if(type == 'int8array') out.writeInt8Array(val);
    else if(type == 'int16array') out.writeInt16Array(val);
    else if(type == 'int32array') out.writeInt32Array(val);
    
    else if(type == 'int16[2]') {
        serializeToken(out, "int16", val[0]);
        serializeToken(out, "int16", val[1]);
    }
    
    else if(type == 'uint32uint8array') out.writeUInt32UInt8Array(val);
    
    else if(DCFile.classLookup[type]) val.serialize(out); // serialize the other class instead ;)
    else if(DCFile.structLookup[type]) serializeStruct(DCFile, out, type, val);
    
    else console.log("Error: unknown type "+type+" serialized");
} 

function serializeStruct(DCFile, out, type, val) {
    console.log("[info] Serializing struct..");
    console.log(type);
    console.log(val);
	
	var struct = DCFile.DCFile[DCFile.structLookup[type]];
	
	for(var i = 0; i < struct[2].length; ++i) {
		serializeToken( out, struct[2][i][0], val[struct[2][i][1]]);
	}
}

function unserializeToken(DCFile, in_p, type){
    type = type.trim();
        
    if(type[type.length-1] == ']') { // arrays have there own little implementation
        // array type
        var dynArray = type[type.length-2] == '[';
        if(dynArray){ // extract type
            type = type.slice(0,-3);
            var len = in_p.readUInt16();
        } else {
            var tparts = type.split(' ');
             len = (tparts[1].slice(1, -1)) * typeLen(DCFile, tparts[0], null); // TODO: bad bad bad bad code
             if(tparts[1].slice(1,-1).indexOf('-') > -1){
                 len = in_p.readUInt16(); // it's range checking failure :p
             }
            type = tparts[0];
        }
        
        var arr = [];
        
		var startingOffset = in_p.offset;
		
		console.log("LEN "+len);
		
        for(var y=0; in_p.offset < (startingOffset + len); y++){
            arr.push(unserializeToken(in_p, type));
        }
        
        if(type.slice(0, 4) == 'char'){
            // string in disguise
            return arr.join("");
        }
        return arr;
    }
    
    if(DCFile.typedefs[type]) type = DCFile.typedefs[type]; // resolve typedefs
    
    var range = type.split('(');
    type = range[0];
   
    if((type.indexOf("int") > -1)){
        var type_p = type.split("%");
        type = type_p[0];
        type = type.split('/')[0].split('%')[0];
    }
    
    var t = null;
    
    type = type.trim();
        
         if(type == 'string')   return in_p.readString();
    else if(type == 'blob')     return in_p.readBlob(in_p.readUInt16());
    
    else if(type == 'char')     return String.fromCharCode(in_p.readUInt8());
    
    else if(type == 'int8')    var t = in_p.readInt8();
    else if(type == 'int16')   var t = in_p.readInt16();
    else if(type == 'int32')   var t = in_p.readInt32();
    else if(type == 'int64 ')   var t = in_p.readInt64();
    else if(type == 'uint8')    var t = in_p.readUInt8();
    else if(type == 'uint16')   var t = in_p.readUInt16();
    else if(type == 'uint32')   var t = in_p.readUInt32();
    else if(type == 'uint64')   var t = in_p.readUInt64();
    
    else if(type == 'uint8array') return in_p.readUInt8Array();
    else if(type == 'uint16array') return in_p.readUInt16Array();
    else if(type == 'uint32array') return in_p.readUInt32Array();
    else if(type == 'int8array') return in_p.readInt8Array();
    else if(type == 'int16array') return in_p.readInt16Array();
    else if(type == 'int32array') return in_p.readInt32Array();
        
    else if(type == 'uint32uint8array') return in_p.readUInt32UInt8Array();
    
    else if(DCFile.structLookup[type]) return unserializeStruct(DCFile, in_p, type);
    
    else console.log("Error: Unknown type "+type+" unserialized");
    
    if((type.indexOf("int") > -1)){
        t /= type_p[0].split("/")[1] ? type_p[0].split("/")[1] : 1;
        if(type_p[1]) t /= type_p[1].split("/")[1] ? type_p[1].split("/")[1] : 1;  
    }
    
    return t;
    
}

function unserializeStruct(DCFile, in_p, type) {
    console.log("[info] Deserialization Struct");
    console.log(type);
	
	var struct = DCFile.DCFile[DCFile.structLookup[type]];
	
	var s = {};
	
	for(var i = 0; i < struct[2].length; ++i) {
		s[ struct[2][i][1] ] = unserializeToken(in_p, struct[2][i][0] );
	}
	
	return s;
}
