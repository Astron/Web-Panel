var air, hierarchy, inspector;

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
	var name = obj.dclass[1]+"("+obj.doId+")";
	new HierarchyNode(HierarchyGlobals.zoneNodes[obj.location.zone], name, "circle", function() {
		inspect(obj);
	}, HierarchyGlobals.context);
	hierarchy.balance();
}

window.addEventListener("load", startAdmin);