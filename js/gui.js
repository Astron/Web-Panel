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
	},
	
	drawLine: function(p1, p2) {		
		var dx = p2.x - p1.x, dy = p2.y - p1.y;
		var len = Math.sqrt( (dx*dx) + (dy*dy) );
		var theta = Math.asin( (dx / len) );
				
		return GUI.create("line", false)
				.move(p1)
				.width(len)
				.rotate(theta - GUI.rightAngle, "top left");
	},
	
	rightAngle: Math.PI / 2
}

function GUIElement(clickable, type) {
	this.el = document.createElement(clickable ? "a" : "div");
	this.el.className = type;
	this.location = GUI.location(0, 0);
	
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
	this.location = loc;
	
	this.el.style.left = this.location.x+"px";
	this.el.style.top = this.location.y+"px";
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

GUIElement.prototype.width = function(width) {
	this.el.style.width = width + "px";
	return this;
}

GUIElement.prototype.rotate = function(radians, origin) {
	this.el.style.transform = this.el.style.webkitTransform = "rotate("+radians+"rad)";
	if(origin) {
		this.el.style.transformOrigin = this.el.style.webkitTransformOrigin = origin;
	}
	return this;
}

// connects two GUIElements with a line
GUIElement.prototype.connect = function(other) {
	var mySize = this.getSize(), otherSize = other.getSize();
		
	var line = GUI.drawLine(GUI.location(
									this.location.x + (mySize.width * 0.5),
		 							this.location.y + (mySize.height * 0.5)
								),
							GUI.location(
									other.location.x + (otherSize.width * 0.5),
									other.location.y + (otherSize.height * 0.5)
								)
							);
	return this;
}

GUIElement.prototype.getSize = function() {
	var style = window.getComputedStyle(this.el);
	return {
		width: style.width.slice(0, -2),
		height: style.height.slice(0, -2)
	};
}

window.addEventListener("load", function() {
	GUI.root = document.getElementById("gui");
});

// represents a hierachy of nodes
function Hierarchy() {
	this.rootNode = new HierarchyNode(null, "Root");
	
	this.maxWidth = 1;
}

Hierarchy.prototype.balance = function() {
	this.calculateMaxWidth(this.rootNode);
}

Hierarchy.prototype.calculateMaxWidth = function(node) {
	var layerMaxWidth = 0;
	
	for(var i = 0; i < node.children.length; ++i) {
		layerMaxWidth += this.calculateMaxWidth(node.children[i]);
	}
	
	return layerMaxWidth || (node == this.rootNode) ? 1 : 0;
}

function HierarchyNode(parent, text) {
	this.parent = parent;
	this.text = text;
	
	this.children = [];
	
	this.element = GUI.create("circle", false)
					  .label(text);
					  
	if(this.parent) this.parent.addChild(this);
}

HierarchyNode.prototype.addChild = function(node) {
	this.children.push(node);
}