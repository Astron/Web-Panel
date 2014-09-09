window.onload = function() {
	var air = new AstronInternalRepository(DebugLevel.TRACE);
	air.connect("localhost", 8198);
}