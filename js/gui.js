var GUI = {
	root : null,
	
	actionCounter: 0,
	actions: {},
}

function GUIElement(clickable, type, GUIlocation) {
	this.el = document.createElement(clickable ? "a" : "div");
	this.el.className = type;
	this.el.style.left = GUIlocation.x;
	this.el.style.top = GUIlocation.y;
	
	GUI.root.appendChild(el);
}

GUIElement.prototype.label = function(text) {
	this.el.appendChild(document.createTextNode(text));
	return this.el;
}

GUIElement.prototype.action = function(action) {
	var count = GUI.actionCounter++;
	GUI.actions[count] = action;
	element.href = "javascript:GUI.actions["+count+"](e)";
	return this.el;
}

function GUILocation(x, y) {
	this.x = x || 0;
	this.y = y || 0;
}

window.addEventListener("load", function() {
	GUI.root = document.body;
});