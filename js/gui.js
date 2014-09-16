var GUI = {
	root : null,
	drawElement : function(type, GUIlocation) {
		var el = document.createElement("div");
		el.className = type;
		el.style.left = GUIlocation.x;
		el.style.top = GUIlocation.y;
		root.appendChild(el);
		return el;
	},
	label: function(element, text) {
		element.appendChild(document.createTextNode(text));
		return element;
	}
}

function GUILocation(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

window.addEventListener("load", function() {
	GUI.root = document.body;
});