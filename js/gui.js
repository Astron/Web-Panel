var GUI = {
	root : null,
	
	actionCounter: 0,
	actions: {},
	
	// wrapper function for shorthand
	create: function(type, clickable) {
		return (new GUIElement(clickable || false, type));
	},
	
	location: function(x, y) {
		return {
			x: x,
			y: y
		}
	}
}

function GUIElement(clickable, type) {
	this.el = document.createElement(clickable ? "a" : "div");
	this.el.className = type;
	
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

GUIElement.prototype.move = function(loc) {
	console.log(loc.x);
	console.log(this.el.style.top);
	this.el.style.left = loc.x+"px";
	this.el.style.top = loc.y+"px";
	console.log(this.el.style.top);
	return this;
}

GUIElement.prototype.backgroundColor = function(bg) {
	this.el.style.backgroundColor = bg;
	return this;
}

GUIElement.prototype.color = function(color) {
	this.el.style.color = color;
	return this;
}

window.addEventListener("load", function() {
	GUI.root = document.body;
});