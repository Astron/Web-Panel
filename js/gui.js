var GUI = {
	root : null,
	drawElement : function(type, GUIlocation) {
		var el = document.createElement("div");
		el.className = type;
		el.style.left = GUIlocation.x;
		el.style.top = GUIlocation.y;
	}
}

function GUILocation(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

window.addEventListener("load", function() {
	GUI.root = document.body;
});