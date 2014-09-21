var air, hierarchy, inspector, inspectedObject;

// in the future, this should be found by either GUI
// and/or new Astron discovery mechanisms
// for now, poke @kestred for feedback

var HierarchyGlobals = {
	root: 10000,
	zones: [
		0
	],
	
	zoneNodes: {
		
	}
}

function startAdmin() {
	air = new AstronInternalRepository(DebugLevel.TRACE);
	air.enterObjectCallback = addObjectToHierarchy;
	
	air.connect("localhost", 8198, "simple_example.dc", function() {
		// connected to Astron
	
		hierarchy = generateHierarchy();
		hierarchy.balance();
		
		inspector = generateInspector();
	});
}

function generateHierarchy() {
	HierarchyGlobals.context = GUI.newRootContext(GUI.location(350, 100));
	var newHierarchy = new Hierarchy(HierarchyGlobals.context);
	
	for(var i = 0; i < HierarchyGlobals.zones.length; ++i) {
		var zone = HierarchyGlobals.zones[i];
		
		HierarchyGlobals.zoneNodes[zone] =
			 new HierarchyNode(newHierarchy.rootNode, HierarchyGlobals.zones[i], "diamond", function() {
				 refreshZone(HierarchyGlobals.root, zone);
			 }, HierarchyGlobals.context);
	}
	
	return newHierarchy;
}

function refreshZone(parent, zone) {
	HierarchyGlobals.zoneNodes[zone].removeChildren();
	
	air.getZonesObjects(function(numObjects) {
		//alert(numObjects+" object(s) in zone "+zone);
	}, parent, [zone]);
}

function addObjectToHierarchy(obj) {
	var name = getObjectName(obj);
	new HierarchyNode(HierarchyGlobals.zoneNodes[obj.location.zone], name, "circle", function() {
		inspect(obj);
	}, HierarchyGlobals.context);
	hierarchy.balance();
}

function generateInspector() {
	return new Table("Inspector", function(key, val) {
		air.setField(inspectedObject, key, val);
	});
}

function inspect(obj) {
	console.log(obj);
	inspectedObject = obj;
	inspector.reset();
	inspector.modifyTitle(getObjectName(obj));
	
	var fields = obj.dclass[2];
	var fieldMap = {};
	for(var i = 0; i < fields.length; ++i) {
		if(obj.properties[fields[i][1]]) {
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

window.addEventListener("load", startAdmin);