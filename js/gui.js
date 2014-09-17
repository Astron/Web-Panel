var GUI = {
	root : null,
	
	actionCounter: 0,
	actions: {},
	
	// wrapper function for shorthand
	create: function(clickable, type, GUIlocation) {
		return (new GUIElement(clickable, type, GUIlocation));
	}
}

function GUIElement(clickable, type, GUIlocation) {
	this.el = document.createElement(clickable ? "a" : "div");
	this.el.className = type;
	this.el.style.left = GUIlocation.x;
	this.el.style.top = GUIlocation.y;
	
	GUI.root.appendChild(this.el);
}

GUIElement.prototype.label = function(text) {
	this.el.appendChild(document.createTextNode(text));
	return this;
}

GUIElement.prototype.action = function(action) {
	var count = GUI.actionCounter++;
	GUI.actions[count] = action;
	this.el.href = "javascript:GUI.actions["+count+"]()";
	return this;
}

function GUILocation(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

window.addEventListener("load", function() {
	GUI.root = document.body;
});