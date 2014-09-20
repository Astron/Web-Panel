var air;

function startAdmin() {
	air = new AstronInternalRepository(DebugLevel.TRACE);
	air.connect("localhost", 8198, "simple_example.dc", function() {
		// connected to Astron
	});
}

window.addEventListener("load", startAdmin);