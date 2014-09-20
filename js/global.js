var air, hierarchy, inspector;

// in the future, this should be found by either GUI
// and/or new Astron discovery mechanisms
// for now, poke @kestred for feedback

var HierarchyGlobals = {
	root: 10000,
	zones: [
		0
	]
}

function startAdmin() {
	air = new AstronInternalRepository(DebugLevel.TRACE);
	air.connect("localhost", 8198, "simple_example.dc", function() {
		// connected to Astron
	
		hierarchy = generateHierarchy();
	});
}

function generateHierarchy() {
	var context = GUI.newRootContext(GUI.location(350, 100));
	var newHierarchy = new Hierarchy(context);
	
	return newHierarchy;
}

window.addEventListener("load", startAdmin);