function DCParser(dcContents) {
	this.lines = dcContents.split("\n");
	
	this.tempDC = [];
	
	this.DCFile = [];
	this.classLookup = {};
	this.structLookup = {};
	this.fieldLookup = [];
	this.reverseFieldLookup = {};
	this.classFields = {};
	this.typedefs = {};
	
	this.index = 0;
	this.line = "";
	this.lindex = -1;
	this.outside = false;
	
	for(var i = 0; i < this.lines.length; ++i) {
		this.readLine();
	}
	
}

DCParser.prototype.searchDC = function(dc, name){
    var i = 0;
    while(i < dc[2].length){
        if(name == dc[2][i][1])
            return i;
        ++i;
    }
    return -1;
}

//reads up to delimeter
DCParser.prototype.readUpTo = function(del){
    if(!del) del = ' ';
    var temp = "";
    while(this.line[this.index] != del) temp += this.line[this.index++];
    this.index++; // skip del
    return temp;
}

DCParser.prototype.readUpToEither = function(dels){
    var temp = "";
    for(;;) {
        if(dels.indexOf(this.line[this.index]) > -1) break;
        temp += this.line[this.index++];
    }
    var del = this.line[this.index++];
    return [temp, del];
}

DCParser.prototype.readLine = function(){
    this.lindex++;
    this.index = 0;
    this.line = this.lines[this.lindex];
    
    if(this.line.length == 0 || this.line[0] == "/"){
        return;
    } else if(this.line[0] == '}'){
        this.outside = false;
        this.DCFile.push(this.tempDC);
        return;
    }
    
    if(!this.outside){
        var type = this.readUpTo(" ");
        switch(type){
            case 'from': // something pythony.. do I care?
                break;
            case 'typedef':
                var oldT = this.readUpTo(" ");
                var newT = this.readUpTo(";");
                
                if(newT[newT.length-1] == ']') {
                    // array clip
                    newT = newT.slice(0,-1);
                    newT = newT.split('[');
                    
                    oldT += '['+newT[1]+']';
                    
                    newT = newT[0];
                }
                
                this.typedefs[newT] = oldT;
                break;
            case 'struct':
                var structName = this.readUpTo(" ");
                this.outside = true;
                this.tempDC = ["struct", structName, []];
                this.structLookup[structName] = this.DCFile.length;
                break;
            case 'dclass':
                var className = this.readUpTo(" ");
                
                var inherited = [];
                
                if(this.line[this.index] == ':'){
                    // inheritance
                    this.index += 2;
                    
                    loop_cont: for(;;){
                        var tmp = this.readUpToEither([",", " "]);
                        var t_class = this.DCFile[this.classLookup[tmp[0]]];
                        if(!t_class){
                            console.log("NULL TClass "+(JSON.stringify(tmp)));
                            console.log(this.line);
                            continue loop_cont; // skip for now
                        }

                        var j = 0;
                        while(j < t_class[2].length){
                            inherited.push(t_class[2][j]);
                            this.reverseFieldLookup[className+"::"+t_class[2][j][1]] = this.reverseFieldLookup[tmp[0]+"::"+t_class[2][j][1]]
                            ++j;
                        }
                        this.index++;
                        if(tmp[1] == ' ' || this.line[this.index] == '{') break;
                    }
                }
                
                this.outside = true;
                this.tempDC = ["dclass", className, inherited];
                
                this.classLookup[className] = this.DCFile.length;
                break;
        }
    } else {
        this.index += 2; // two whitespace.. idk why
        
        this.tempDC[2].push(this.readType());
    }
}

DCParser.prototype.readType = function(){    
    var res = this.readUpToEither([" ", "("]);
    
    switch(res[1]){
        case ' ': // variable of some sort
            var type_v = res[0];
            var name_v = this.readUpToEither([" ", ";"]);
            
            
            if(name_v[0] == ':'){ // morph
                var name_m = res[0];
                var components = [];
                for(;;){
                    var temp = this.readUpToEither([",",";"]);
                    this.index += 1;
                    components.push(temp[0]);
                    if(temp[1] == ';') break;
                }
                var modifiers_m = [];
                var params_m = [];
                
                var i = 0;
                while(i < components.length){                    
                    var j = searchDC(this.tempDC, components[i++]);
                    if(j == -1){
                        console.log("ERROR: nonexistant component "+components[i-1]);
                    }
                    modifiers_m = this.tempDC[2][j][2];
                    params_m = params_m.concat(this.tempDC[2][j][3])
                }
                modifiers_m.push["morph"];
                this.reverseFieldLookup[this.tempDC[1]+"::"+name_m] = this.fieldLookup.length;
                this.fieldLookup.push([this.tempDC[1], "function", name_m, modifiers_m, params_m, components]);
                return ["function", name_m, modifiers_m, params_m, components];
                
                break;
            }
            
            var modifiers_v = [];
            if(name_v[1] == ' '){
                // modifiers
                for(;;){
                    var tmp_v = this.readUpToEither([" ", ";"]);
                    modifiers_v.push(tmp_v[0]);
                    if(tmp_v[1] == ';') break;
                }
            }
            name_v = name_v[0];
            
            // avoid clobbering array brackets with property name
            if(name_v[name_v.length-1] == ']'){
                name_v = name_v.slice(0, -2);
                type_v += "[]";
            }
            
            this.reverseFieldLookup[this.tempDC[1]+"::"+name_v] = this.fieldLookup.length;
            this.fieldLookup.push([this.tempDC[1], type_v, name_v, modifiers_v]);
            return [type_v, name_v, modifiers_v];
        case '(': // function
            var name_f = res[0];
            
            var params_f = [];
            
            
            for(;;){
                var param_f = this.readUpToEither([",","(", ")"]);
                while(param_f[0] == ' '){
                    param_f = param_f.slice(1);
                }
				
				if(param_f[0].indexOf(' ') > -1) {
					var p = param_f[0].split(" ");
					
					var l = p[p.length - 1];
					
					if( (l * 1) != l) { 
						// if it's a number, it's probably just weirdly spaced inline math
						// if not, we need to strip off the property name
												
						param_f[0] = p.slice(0, -1).join(" ");
					}
						
				}
				
                if(param_f[1] == '('){
                    this.readUpTo(")");
                    
                    if(this.line[this.index+1] == '['){
                        this.index += 2;
                        var ind = this.readUpTo("]");
                        param_f[0] += " ["+ind+"]";
                    }
                    
                    params_f.push(param_f[0]);
                       
                    if(this.line[this.index++] == ')') break;
                } else {
                    params_f.push(param_f[0]);
                
                    if(param_f[1] == ')') break;
                    this.index++;
                }
                
            }
            
            var modifiers_f = [];
            if(this.line[this.index++] == ' '){
                // modifiers
                for(;;){
                    var tmp_f = this.readUpToEither([" ", ";"]);
                    modifiers_f.push(tmp_f[0]);
                    if(tmp_f[1] == ';') break;
                }
            }
            
            this.reverseFieldLookup[this.tempDC[1]+"::"+name_f] = this.fieldLookup.length;
            this.fieldLookup.push([this.tempDC[1], "function", name_f, modifiers_f, params_f]);
            return ["function", name_f, modifiers_f, params_f];
    }
}

// using XMLHttpRequest, fetch the DC file by URL
// then, pass the contents to a new DCParser instance
// finally, return the DCParser instance
// callback(bool success, DCParser parser)
// TODO: look into how the same-origin policy affects this

function fetchDCFile(url, callback) {
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if(request.readyState == 4) {
			if(request.status == 200) {
				// ensure document is fully transferred
				var parser = new DCParser(request.responseText);
				callback(true, parser);
			} else {
				callback(false, null);
			}
		}
	}
	request.open('GET', url, true);
	request.send(null);
}