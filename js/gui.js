var GUI = {
	root : null,
	
	actionCounter: 0,
	actions: {},
	
	// wrapper function for shorthand
	create: function(type, clickable, root) {
		return (new GUIElement(clickable || false, type, root));
	},
	
	location: function(x, y) {
		return {
			x: x,
			y: y
		}
	},
	
	drawLine: function(p1, p2, root) {		
		var dx = p2.x - p1.x, dy = p2.y - p1.y;
		var len = Math.sqrt( (dx*dx) + (dy*dy) );
		var theta = Math.asin( (dx / len) );
				
		return GUI.create("line", false, root)
				.move(p1)
				.width(len)
				.rotate(theta - GUI.rightAngle, "top left");
	},
	
	newRootContext: function(location) {
		var ctx = document.createElement("div");
		ctx.style.position = "absolute";
		ctx.style.left = location.x+"px";
		ctx.style.top = location.y+"px";
		GUI.root.appendChild(ctx);
		return ctx;
	},
	
	rightAngle: Math.PI / 2
}

function GUIElement(clickable, type, root) {
	this.type = type;
	
	this.el = document.createElement(clickable ? "a" : "div");
	this.el.className = this.type;
	this.location = GUI.location(0, 0);
	
	this.root = root || GUI.root;
	
	this.root.appendChild(this.el);
}

GUIElement.prototype.label = function(text) {
	var s = document.createElement("span");
	s.className = this.type+"Label";
	s.appendChild(document.createTextNode(text));
	
	this.el.appendChild(s);
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

GUIElement.prototype.delete = function() {
	this.root.removeChild(this.el);
}

// connects two GUIElements with a line
GUIElement.prototype.connect = function(other, root) {
	var mySize = this.getSize(), otherSize = other.getSize();
	var line = GUI.drawLine(GUI.location(
									this.location.x + (mySize.width * 0.5),
		 							this.location.y + (mySize.height * 0.5)
								),
							GUI.location(
									other.location.x + (otherSize.width * 0.5),
									other.location.y + (otherSize.height * 0.5)
								),
								root
							);
	return line; // this is a gotcha we ought to document somewhere
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
function Hierarchy(root) {
	this.rootNode = new HierarchyNode(null, "Root", null, null, root);
	
	this.maxWidth = 1;
}

Hierarchy.prototype.balance = function(scale) {
	this.rootNode.recalcPositions(scale || 200);
}

Hierarchy.calculateMaxHeight = function(node) {
	var maxHeight = 1;
	if(node.children.length > maxHeight) maxHeight = node.children.length;
	
	for(var i = 0; i < node.children.length; ++i) {
		var h = Hierarchy.calculateMaxHeight(node.children[i]);
		maxHeight += h - 1;
	}
	
	return maxHeight;
}

Hierarchy.prototype.calculateMaxWidth = function(node) {
	var layerMaxWidth = 0;
	
	for(var i = 0; i < node.children.length; ++i) {
		layerMaxWidth += this.calculateMaxWidth(node.children[i]);
	}
	
	return layerMaxWidth || (node == this.rootNode) ? 1 : 0;
}

function HierarchyNode(parent, text, type, action, root) {
	this.parent = parent;
	this.text = text;
	
	this.children = [];
	
	this.element = GUI.create(type || "circle", action !== undefined, root)
					  .label(text);
					  
	if(action) {
		this.element.action(action);
	}
	
	this.layersFromRoot = 0;
	this.age = 0;
	
	this.root = root;
					  
	if(this.parent) {
		this.parent.addChild(this);
		this.layersFromRoot = this.parent.layersFromRoot + 1;
		this.age = this.parent.children.length - 1;
	}
}

HierarchyNode.prototype.addChild = function(node) {
	this.children.push(node);
}

HierarchyNode.prototype.calculateGridPosition = function() {
	this.gridX = this.layersFromRoot;
	
	var yOffset = 0;
	var adjustment = 0;
	var parentYOffset = 0;
	
	if(this.parent) {
		parentYOffset = this.parent.calculateGridPosition().y;
	}
	
	if(this.age > 0) {
		var nextSibling = this.parent.children[this.age - 1];
		
		// TODO: OPTIMIZE ME
		yOffset = nextSibling.calculateGridPosition().y - parentYOffset;
		adjustment = Hierarchy.calculateMaxHeight(nextSibling);
	}
	
	
	this.gridY = yOffset + adjustment + parentYOffset;
	
	return {
		x: this.gridX,
		y: this.gridY
	}
}

HierarchyNode.prototype.recalcPosition = function(scale) {
	this.calculateGridPosition();
	this.element.move(GUI.location(this.gridX * scale, this.gridY * scale));
	if(this.parent){
		console.log(this.element+"->"+this.parent);
		
		if(this.connection) {
			this.connection.delete();
		}
		
		this.connection = this.element.connect(this.parent.element, this.root);
	} 
}

HierarchyNode.prototype.recalcPositions = function(scale) {
	this.recalcPosition(scale);
	
	for(var i = 0; i < this.children.length; ++i) {
		this.children[i].recalcPositions(scale);
	}
}

function Table(title, editedAction) {
	this.title = title;
	this.element = document.createElement("table");
	GUI.root.appendChild(this.element);
	this.titleRow();
	
	this.hash = {};
	this.keys = [];
	
	this.isEditable = editedAction || false;
	this.editedAction = editedAction;
}

Table.prototype.titleRow = function() {
	var row = document.createElement("tr");
	var col = document.createElement("th");
	col.setAttribute("colspan", 99);
	col.appendChild(document.createTextNode(this.title));
	
	row.appendChild(col);
	this.element.appendChild(row);
}

Table.prototype.addKey = function(key, vals) {
	if(!Array.isArray(vals)) vals = [vals];
	
	this.keys.push(key);
	this.hash[key] = vals;
	
	var row = document.createElement("tr");
	
	var col1 = document.createElement("td");
	col1.appendChild(document.createTextNode(key));
	row.appendChild(col1);
	
	for(var i = 0; i < vals.length; ++i) {
		var valCol = document.createElement("td");
		
		if(i == vals.length - 1 && !this.isEditable) {
			valCol.setAttribute("colspan", 99);
		}
		
		if(this.isEditable) {
			valCol.setAttribute("contentEditable", "true");
		}
		
		valCol.appendChild(document.createTextNode(vals[i]));
		row.appendChild(valCol);
	}
	
	if(this.isEditable) {
		var editCol = document.createElement("td");
		editCol.setAttribute("colspan", 99);
		
		var btn = document.createElement("input");
		btn.setAttribute("type", "submit");
		btn.setAttribute("value", "Done");
		
		var that = this;
		
		btn.onclick = function() {
			that.hash[key] = that.getEditedValue(this.parentElement.parentElement);
			that.editedAction(key, that.hash[key]);
		}
		
		editCol.appendChild(btn);
		row.appendChild(editCol);
	}
	
	this.element.appendChild(row);
}

Table.prototype.modifyKey = function(key, newVals) {
	if(!Array.isArray(newVals)) newVals = [newVals];
	
	this.hash[key] = newVals;
	
	var index = this.keys.indexOf(key);
	if(index == -1) {
		// FIXME do something more intelligent here
		console.log("Modifying unknown table key: "+key);
		return;
	}
	
	var el = this.element.children[1+index];
	
	if(el.children.length - 1 != newVals.length) {
		console.log("Incorrect value length for preexisting key");
		return;
	}
	
	for(var i = 0; i < newVals.length; ++i) {
		el.children[1+i].innerHTML = newVals[i];
	}
}

Table.prototype.addMap = function(map) {
	var keys = Object.keys(map);
	
	for(var i = 0; i < keys.length; ++i) {
		this.addKey(keys[i], map[keys[i]]);
	}
}

Table.prototype.getEditedValue = function(row) {
	var children = row.children;
	
	var res = [];
	
	for(var i = 1; i < children.length - 1; ++i) {
		var col = children[i];
		res.push(col.innerHTML);
	}
	
	return res;
}

Table.prototype.modifyTitle = function(newTitle) {
	this.title = newTitle;
	this.element.children[0].children[0].innerHTML = newTitle
}

Table.prototype.reset = function() {
	this.hash = {};
	this.keys = [];
	
	var numElements = this.element.children.length;
	for(var i = 1; i < numElements; ++i) {
		this.element.removeChild(this.element.children[1]);
	}
}