/**
 * JointJs Plugin to perform auto layout of JointJs graph, using KLayJs.
 * More information about KLayJs can be found at below given links.
 * 
 * https://github.com/OpenKieler/klayjs
 * https://rtsys.informatik.uni-kiel.de/confluence/display/KIELER/KLay+Layered+Layout+Options
 * 
 * This first implementation supports only simple graphs, can be improved to support other layout features of KLayJs.
 */
(function () {
	joint.dia.Graph.prototype.toKlayGraph = function(kgraph, options) {
	    this.get('cells').each(function _eachCell(cell) {
	        if (cell.isLink()) {

	            var source = cell.get('source'),
	            	target = cell.get('target');

	            // Links that end at a point are ignored.
	            if (!source.id || !target.id) return;

	            // create edge object and add to edges array of kgraph object
	            var edge = options.createEdge(cell);
	            kgraph.edges.push(edge);
	        } else {
	        	// create node object and add as children of 'root', in kgraph object
	        	var node = options.createNode(cell);
		        kgraph.children.push(node);
	        }
	    });

	    return this;
	};

	joint.dia.Graph.prototype.fromKlayGraph = function(kgraph, options) {
		// import nodes
		_.forEach(kgraph.children, function _eachNode(knode) {
			options.importNode.call(this, knode);
		}, this);

		if (options.setLinkVertices) {
			// import edges
			_.forEach(kgraph.edges, function _eachEdge(kedge) {
				options.importEdge.call(this, kedge);
			}, this);
		}
		return this;
	};

	joint.layout.KlayGraph = {
		layout : function layout(jgraph, options, goptions) {
			// create options with defaults for KLay layout
			options = _.defaultsDeep(options || {}, {
				spacing: 80, 
				edgeRouting : 'ORTHOGONAL', // 'POLYLINE', 'SPLINES', 'UNDEFINED'
				direction : 'DOWN', // 'RIGHT'
				mergeEdges: true,
				intCoordinates : true,
				debugMode : true
			});

			// create object to represent graph data
			var kgraph = {
				id : 'root',
				children : [],
				edges : []
			};

			// options containing functions, to be used to run layout and update JointJs graph later
			goptions = goptions || {
				setLinkVertices : false,
				// utility function to create node object
				createNode : function createNode(element) {
					return {
						id : element.id,
	                    width: element.get('size').width,
	                    height: element.get('size').height,
	                    children : []
	                };
				},
				// utility function to create edge object
				createEdge : function createEdge(link) {
					return {
						id : link.id,
						source : link.get('source').id,
						target : link.get('target').id
					};
				},
				// utility function to import KLay graph node info in to JointJs
				importNode : function importNode(knode) {
		            var _cell = this.getCell(knode.id);

		            if (!_cell) return;

		            // update JointJs node info
		           	_cell.set('position', {
		           		x: knode.x,
		           		y: knode.y
		           	});
				},
				// utility function to import KLay graph edge info in to JointJs
				importEdge : function importEdge(kedge) {
					var _link = this.getCell(kedge.id);

					if (!_link) return;
					// prepare edge vertices
					var vertices = [];
					vertices.push(kedge.sourcePoint);

					// add bendPoints only if exists
					if (kedge.bendPoints)
						vertices.concat(kedge.bendPoints);

					vertices.push(kedge.targetPoint);

					// update JointJs link vertices info
					_link.set('vertices', vertices);
				}
			};

			// create KLayJs graph data object from JointJs graph
			jgraph.toKlayGraph(kgraph, goptions);

			$klay.layout({
				graph : kgraph,
				options : options,
				success: function _success(kgraph) {
					console.info('KLay layout SUCCEEDED');

					// after successful layout - update JointJs graph from KLayJs graph
					jgraph.fromKlayGraph(kgraph, goptions);
				},
				error: function _error(error) {
					console.error('KLay layout FAILED');
				}
			});
		}
	};
})();