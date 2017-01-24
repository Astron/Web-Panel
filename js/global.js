var air, hierarchy, inspector, inspectedObject;

// in the future, this should be found by either GUI
// and/or new Astron discovery mechanisms
// for now, poke @kestred for feedback

var HierarchyGlobals = {
	root: 10000,
	
	objectZoneNodes: {
		
	},
	
	objectNodes: {
		
	}
}

function startAdmin() {
	document.getElementById('host').value = location.host || "127.0.0.1";
	
	air = new AstronInternalRepository(DebugLevel.TRACE);
	air.enterObjectCallback = addObjectToHierarchy;
	air.authCallback = authResponse;
}

function launchControlPanel() {
	document.body.removeChild(document.getElementById("auth"));
	
	hierarchy = generateHierarchy();
	hierarchy.balance();
	
	inspector = generateInspector();
}

function generateHierarchy() {
	HierarchyGlobals.context = GUI.newRootContext(GUI.location(350, 100));
	var newHierarchy = new Hierarchy(HierarchyGlobals.context);
	
	HierarchyGlobals.objectNodes[HierarchyGlobals.root] = newHierarchy.rootNode;
	
	air.getZones(zonesDiscovered, HierarchyGlobals.root);
	
	return newHierarchy;
}

function refreshZone(parent, zone) {	
	HierarchyGlobals.objectZoneNodes[parent.toString()][zone].removeChildren();
	
	air.getZonesObjects(function(numObjects) {
		//alert(numObjects+" object(s) in zone "+zone);
	}, parent, [zone]);
}

function addObjectToHierarchy(obj) {
	var name = getObjectName(obj);
	HierarchyGlobals.objectNodes[obj.doid] = 
		new HierarchyNode(HierarchyGlobals.objectZoneNodes[obj.location.parent.toString()][obj.location.zone], name, "circle", function() {
			air.getZones(zonesDiscovered, obj.doId);
			inspect(obj);
		}, HierarchyGlobals.context);
	hierarchy.balance();
}

function zonesDiscovered(parent, zones) {
	for(var i = 0; i < zones.length; ++i) {
		var zone = zones[i];
	
		if(!HierarchyGlobals.objectZoneNodes[parent.toString()]) HierarchyGlobals.objectZoneNodes[parent.toString()] = {};
		
		console.log(parent);
		
		HierarchyGlobals.objectZoneNodes[parent.toString()][zone] =
			 new HierarchyNode(HierarchyGlobals.objectNodes[parent.toString()], zones[i], "diamond", function() {
				 refreshZone(parent, zone);
			 }, HierarchyGlobals.context);
	}
	
	hierarchy.balance();
}

function generateInspector() {
	return new Table("Inspector", hasManipulation ? function(key, val) {
		if(val[val.length-1].indexOf("<br>") > -1) {
			val[val.length-1] = val[val.length-1].slice(0, -4);
		}
		
		air.setField(inspectedObject, key, val);
	} : null);
}

function inspect(obj) {
	inspectedObject = obj;
	inspector.reset();
	inspector.modifyTitle(getObjectName(obj));
		
	var fields = obj.dclass[2];
	var fieldMap = {};
	for(var i = 0; i < fields.length; ++i) {
		if(obj.properties[fields[i][1]] != undefined) {
			fieldMap[fields[i][1]] = obj.properties[fields[i][1]];
		} else {
			var params = fields[i][3];
			var autovals = [];
			
			for(var p = 0; p < params.length; ++p) {
				autovals.push(getDefaultValue(params[p]));
			}
			
			fieldMap[fields[i][1]] = autovals;
		}
	}
	inspector.addMap(fieldMap);
}

function getObjectName(obj) {
	return obj.dclass[1]+"("+obj.doId+")";
}

function getDefaultValue(type) {
	if(/u?int(\d+)/.test(type)) {
		return 0;
	} else if(type == "string") {
		return "";
	} else {
		console.log("Unknown default value for type: "+type);
	}
}

function authenticate() {
	var host = document.getElementById("host").value;
	var port = document.getElementById("port").value;
	var username = document.getElementById("username").value;
	var password = document.getElementById("password").value;
	
	air.connect(host, port, "simple_example.dc", function() {
		// connected to Astron
		air.authenticate(username, password);
	});	
}

function authResponse(success, permissions) {
	if(success) {
		hasManipulation = permissions.hasManipulation;
		launchControlPanel();
	} else {
		document.getElementById("authstatus").innerHTML = "Incorrect username or password";
		document.getElementById("authstatus").style.color = "red";
		document.getElementById("authstatus").style.display = "block";
	}
}

window.addEventListener("load", startAdmin);