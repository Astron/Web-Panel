var GUI = {
	root : null,
	drawElement : function(clickable, type, GUIlocation) {
		var el = document.createElement(clickable ? "a" : "div");
		el.className = type;
		el.style.left = GUIlocation.x;
		el.style.top = GUIlocation.y;
		GUI.root.appendChild(el);
		return el;
	},
	
	actionCounter: 0,
	actions: {},
	
	action: function(element, action) {
		var count = actionCounter++;
		actions[count] = action;
		element.href = "javascript:GUI.actions["+count+"](e)";
	}
	
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