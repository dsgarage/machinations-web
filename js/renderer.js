/**
 * renderer.js - SVG Rendering
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    var SVG_NS = 'http://www.w3.org/2000/svg';

    var NODE_SIZES = {
        pool: { radius: 30 },
        source: { width: 50, height: 44 },
        drain: { width: 50, height: 44 },
        converter: { width: 50, height: 44 },
        gate: { width: 44, height: 44 },
        trader: { radius: 28 },
        register: { width: 60, height: 36 },
        endCondition: { radius: 30 }
    };

    function Renderer(svgElement, graph) {
        this.svg = svgElement;
        this.graph = graph;
        this.nodesLayer = svgElement.querySelector('#nodes-layer');
        this.connectionsLayer = svgElement.querySelector('#connections-layer');
        this.animationsLayer = svgElement.querySelector('#animations-layer');
        this.canvasGroup = svgElement.querySelector('#canvas-group');
        this.tempConnection = svgElement.querySelector('#temp-connection');

        this.viewBox = { x: 0, y: 0, width: 1200, height: 800 };
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;

        this._nodeElements = {};
        this._connectionElements = {};
        this._animationTokens = [];

        this._isDark = false;
    }

    Renderer.prototype.setDarkMode = function(isDark) {
        this._isDark = isDark;
    };

    Renderer.prototype.updateTransform = function() {
        var transform = 'translate(' + this.panX + ',' + this.panY + ') scale(' + this.zoom + ')';
        this.canvasGroup.setAttribute('transform', transform);
    };

    Renderer.prototype.screenToWorld = function(screenX, screenY) {
        var rect = this.svg.getBoundingClientRect();
        var x = (screenX - rect.left - this.panX) / this.zoom;
        var y = (screenY - rect.top - this.panY) / this.zoom;
        return { x: x, y: y };
    };

    Renderer.prototype.zoomAt = function(delta, screenX, screenY) {
        var oldZoom = this.zoom;
        this.zoom *= (1 + delta * 0.1);
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));

        var rect = this.svg.getBoundingClientRect();
        var mouseX = screenX - rect.left;
        var mouseY = screenY - rect.top;

        this.panX = mouseX - (mouseX - this.panX) * (this.zoom / oldZoom);
        this.panY = mouseY - (mouseY - this.panY) * (this.zoom / oldZoom);

        this.updateTransform();
    };

    Renderer.prototype.pan = function(dx, dy) {
        this.panX += dx;
        this.panY += dy;
        this.updateTransform();
    };

    Renderer.prototype.clear = function() {
        this.nodesLayer.innerHTML = '';
        this.connectionsLayer.innerHTML = '';
        this.animationsLayer.innerHTML = '';
        this.tempConnection.innerHTML = '';
        this._nodeElements = {};
        this._connectionElements = {};
    };

    Renderer.prototype.renderAll = function() {
        this.clear();
        var conns = this.graph.getAllConnections();
        for (var i = 0; i < conns.length; i++) {
            this.renderConnection(conns[i]);
        }
        var nodes = this.graph.getAllNodes();
        for (var i = 0; i < nodes.length; i++) {
            this.renderNode(nodes[i]);
        }
    };

    // ===== Node Rendering =====

    Renderer.prototype.renderNode = function(node) {
        var g = this._createSVG('g', {
            'class': 'node-group',
            'data-id': node.id,
            'transform': 'translate(' + node.x + ',' + node.y + ')'
        });

        var typeDef = node.getTypeDef();
        var shape = this._createNodeShape(node, typeDef);
        g.appendChild(shape);

        // Activation mode indicator
        var modeSymbol = M.ACTIVATION_MODES[node.properties.activationMode];
        if (modeSymbol && modeSymbol.symbol) {
            var indicator = this._createSVG('text', {
                'class': 'node-mode-indicator',
                'x': 0,
                'y': -this._getNodeTopY(node) - 6,
                'text-anchor': 'middle',
                'font-size': '10'
            });
            indicator.textContent = modeSymbol.symbol;
            g.appendChild(indicator);
        }

        // Value display
        if (node.type === 'pool' || node.type === 'register') {
            var valueText = this._createSVG('text', {
                'class': 'node-value',
                'x': 0,
                'y': 5,
                'text-anchor': 'middle'
            });
            valueText.textContent = node.type === 'register' ?
                (node.properties.value || 0) :
                Math.round(node.resources);
            g.appendChild(valueText);
        }

        // Name label
        var nameLabel = this._createSVG('text', {
            'class': 'node-label',
            'x': 0,
            'y': this._getNodeBottomY(node) + 16,
            'text-anchor': 'middle',
            'font-size': '11'
        });
        nameLabel.textContent = node.properties.name || '';
        g.appendChild(nameLabel);

        // Interactive click area
        if (node.properties.activationMode === 'interactive') {
            var clickArea = this._createNodeShape(node, typeDef);
            clickArea.setAttribute('class', 'interactive-click-target');
            clickArea.setAttribute('fill', '#2196F3');
            g.appendChild(clickArea);
        }

        this.nodesLayer.appendChild(g);
        this._nodeElements[node.id] = g;
        return g;
    };

    Renderer.prototype._createNodeShape = function(node, typeDef) {
        var fill = typeDef.fill;
        var stroke = typeDef.stroke;
        var shape;

        switch (typeDef.shape) {
            case 'circle':
                shape = this._createSVG('circle', {
                    'class': 'node-shape',
                    'cx': 0, 'cy': 0,
                    'r': NODE_SIZES.pool.radius,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;

            case 'doubleCircle':
                var outer = this._createSVG('circle', {
                    'class': 'node-shape',
                    'cx': 0, 'cy': 0,
                    'r': NODE_SIZES.endCondition.radius,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 3
                });
                shape = this._createSVG('g', {});
                shape.appendChild(outer);
                var inner = this._createSVG('circle', {
                    'cx': 0, 'cy': 0,
                    'r': NODE_SIZES.endCondition.radius - 5,
                    'fill': 'none',
                    'stroke': stroke,
                    'stroke-width': 2
                });
                shape.appendChild(inner);
                shape.setAttribute('class', 'node-shape');
                break;

            case 'triangleUp': {
                var w = NODE_SIZES.source.width;
                var h = NODE_SIZES.source.height;
                var points = '0,' + (-h/2) + ' ' + (w/2) + ',' + (h/2) + ' ' + (-w/2) + ',' + (h/2);
                shape = this._createSVG('polygon', {
                    'class': 'node-shape',
                    'points': points,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;
            }

            case 'triangleDown': {
                var w = NODE_SIZES.drain.width;
                var h = NODE_SIZES.drain.height;
                var points = '0,' + (h/2) + ' ' + (w/2) + ',' + (-h/2) + ' ' + (-w/2) + ',' + (-h/2);
                shape = this._createSVG('polygon', {
                    'class': 'node-shape',
                    'points': points,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;
            }

            case 'triangleRight': {
                var w = NODE_SIZES.converter.width;
                var h = NODE_SIZES.converter.height;
                var points = (-w/2) + ',' + (-h/2) + ' ' + (w/2) + ',0 ' + (-w/2) + ',' + (h/2);
                shape = this._createSVG('polygon', {
                    'class': 'node-shape',
                    'points': points,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;
            }

            case 'diamond': {
                var s = NODE_SIZES.gate.width / 2;
                var points = '0,' + (-s) + ' ' + s + ',0 0,' + s + ' ' + (-s) + ',0';
                shape = this._createSVG('polygon', {
                    'class': 'node-shape',
                    'points': points,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;
            }

            case 'hexagon': {
                var r = NODE_SIZES.trader.radius;
                var pts = [];
                for (var a = 0; a < 6; a++) {
                    var angle = (Math.PI / 3) * a - Math.PI / 6;
                    pts.push(Math.round(r * Math.cos(angle)) + ',' + Math.round(r * Math.sin(angle)));
                }
                shape = this._createSVG('polygon', {
                    'class': 'node-shape',
                    'points': pts.join(' '),
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;
            }

            case 'rect':
                shape = this._createSVG('rect', {
                    'class': 'node-shape',
                    'x': -NODE_SIZES.register.width / 2,
                    'y': -NODE_SIZES.register.height / 2,
                    'width': NODE_SIZES.register.width,
                    'height': NODE_SIZES.register.height,
                    'rx': 4,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                break;

            default:
                shape = this._createSVG('circle', {
                    'class': 'node-shape',
                    'cx': 0, 'cy': 0, 'r': 20,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
        }

        return shape;
    };

    Renderer.prototype._getNodeTopY = function(node) {
        var sizes = NODE_SIZES[node.type];
        if (!sizes) return 20;
        if (sizes.radius) return sizes.radius;
        if (sizes.height) return sizes.height / 2;
        return 20;
    };

    Renderer.prototype._getNodeBottomY = function(node) {
        return this._getNodeTopY(node);
    };

    Renderer.prototype.getNodeBounds = function(node) {
        var sizes = NODE_SIZES[node.type] || { radius: 20 };
        var r = sizes.radius || Math.max(sizes.width, sizes.height) / 2 || 20;
        return {
            x: node.x - r,
            y: node.y - r,
            width: r * 2,
            height: r * 2,
            radius: r
        };
    };

    // ===== Connection Rendering =====

    Renderer.prototype.renderConnection = function(conn) {
        var source = this.graph.getNode(conn.sourceId);
        var target = this.graph.getNode(conn.targetId);
        if (!source || !target) return;

        var g = this._createSVG('g', {
            'class': 'connection-group',
            'data-id': conn.id
        });

        var points = this._calcConnectionPoints(source, target);
        var pathData = this._calcBezierPath(points.sx, points.sy, points.tx, points.ty);

        var isDark = this._isDark;
        var markerUrl, strokeColor, dashArray;

        if (conn.type === 'stateConnection') {
            markerUrl = isDark ? 'url(#arrowhead-state-dark)' : 'url(#arrowhead-state)';
            strokeColor = isDark ? '#999' : '#666';
            dashArray = '6,3';

            var stateType = conn.properties.stateType || 'labelModifier';
            if (stateType === 'trigger') {
                markerUrl = 'url(#trigger-marker)';
            }
        } else {
            markerUrl = isDark ? 'url(#arrowhead-dark)' : 'url(#arrowhead)';
            strokeColor = isDark ? '#ccc' : '#333';
            dashArray = 'none';
        }

        // Hit area (invisible wider path for easier clicking)
        var hitArea = this._createSVG('path', {
            'class': 'connection-hit-area',
            'd': pathData,
            'data-id': conn.id
        });
        g.appendChild(hitArea);

        // Visible path
        var path = this._createSVG('path', {
            'class': 'connection-path',
            'd': pathData,
            'stroke': strokeColor,
            'stroke-width': 2,
            'stroke-dasharray': dashArray,
            'marker-end': markerUrl,
            'data-id': conn.id
        });
        g.appendChild(path);

        // Label
        var rate = conn.properties.rate;
        var label = conn.properties.label || '';
        var displayLabel = '';
        if (conn.type === 'resourceConnection' && rate !== undefined && rate !== 1) {
            displayLabel = String(rate);
        }
        if (label) {
            displayLabel = displayLabel ? displayLabel + ' ' + label : label;
        }
        if (conn.type === 'stateConnection') {
            var stType = M.STATE_CONNECTION_TYPES[conn.properties.stateType];
            if (stType) displayLabel = stType.name;
            if (conn.properties.formula) {
                displayLabel += ': ' + conn.properties.formula;
            }
        }

        if (displayLabel) {
            var midX = (points.sx + points.tx) / 2;
            var midY = (points.sy + points.ty) / 2 - 10;
            var labelEl = this._createSVG('text', {
                'class': 'connection-label',
                'x': midX,
                'y': midY,
                'text-anchor': 'middle',
                'font-size': '11'
            });
            labelEl.textContent = displayLabel;
            g.appendChild(labelEl);
        }

        this.connectionsLayer.appendChild(g);
        this._connectionElements[conn.id] = g;
        return g;
    };

    Renderer.prototype._calcConnectionPoints = function(source, target) {
        var sBounds = this.getNodeBounds(source);
        var tBounds = this.getNodeBounds(target);

        var dx = target.x - source.x;
        var dy = target.y - source.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) dist = 1;

        var nx = dx / dist;
        var ny = dy / dist;

        return {
            sx: source.x + nx * sBounds.radius,
            sy: source.y + ny * sBounds.radius,
            tx: target.x - nx * (tBounds.radius + 10),
            ty: target.y - ny * (tBounds.radius + 10)
        };
    };

    Renderer.prototype._calcBezierPath = function(sx, sy, tx, ty) {
        var dx = tx - sx;
        var dy = ty - sy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var curvature = Math.min(dist * 0.2, 50);

        // Simple straight line with slight curve
        var mx = (sx + tx) / 2;
        var my = (sy + ty) / 2;

        // Add slight perpendicular offset for curves
        if (Math.abs(dx) > Math.abs(dy)) {
            return 'M' + sx + ',' + sy + ' C' + (sx + curvature) + ',' + sy + ' ' + (tx - curvature) + ',' + ty + ' ' + tx + ',' + ty;
        } else {
            return 'M' + sx + ',' + sy + ' C' + sx + ',' + (sy + curvature) + ' ' + tx + ',' + (ty - curvature) + ' ' + tx + ',' + ty;
        }
    };

    // ===== Temp Connection (while creating) =====

    Renderer.prototype.showTempConnection = function(sx, sy, tx, ty, isState) {
        this.tempConnection.innerHTML = '';
        var line = this._createSVG('line', {
            'class': 'temp-connection-line',
            'x1': sx, 'y1': sy,
            'x2': tx, 'y2': ty,
            'stroke': isState ? '#9c27b0' : '#2196F3',
            'stroke-width': 2,
            'stroke-dasharray': isState ? '6,3' : '4,4'
        });
        this.tempConnection.appendChild(line);
    };

    Renderer.prototype.hideTempConnection = function() {
        this.tempConnection.innerHTML = '';
    };

    // ===== Selection =====

    Renderer.prototype.setNodeSelected = function(nodeId, selected) {
        var el = this._nodeElements[nodeId];
        if (!el) return;
        if (selected) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    };

    Renderer.prototype.setConnectionSelected = function(connId, selected) {
        var el = this._connectionElements[connId];
        if (!el) return;
        var path = el.querySelector('.connection-path');
        if (path) {
            if (selected) {
                path.classList.add('selected');
            } else {
                path.classList.remove('selected');
            }
        }
    };

    Renderer.prototype.clearSelection = function() {
        var selected = this.nodesLayer.querySelectorAll('.selected');
        for (var i = 0; i < selected.length; i++) {
            selected[i].classList.remove('selected');
        }
        var selPaths = this.connectionsLayer.querySelectorAll('.selected');
        for (var i = 0; i < selPaths.length; i++) {
            selPaths[i].classList.remove('selected');
        }
    };

    // ===== Update =====

    Renderer.prototype.updateNode = function(node) {
        var el = this._nodeElements[node.id];
        if (!el) return;
        el.setAttribute('transform', 'translate(' + node.x + ',' + node.y + ')');

        // Update value text
        var valueText = el.querySelector('.node-value');
        if (valueText) {
            if (node.type === 'register') {
                valueText.textContent = Math.round((node.properties.value || 0) * 100) / 100;
            } else {
                valueText.textContent = Math.round(node.resources);
            }
        }

        // Update name label
        var nameLabel = el.querySelector('.node-label');
        if (nameLabel) {
            nameLabel.textContent = node.properties.name || '';
        }
    };

    Renderer.prototype.updateConnection = function(conn) {
        var el = this._connectionElements[conn.id];
        if (!el) {
            this.renderConnection(conn);
            return;
        }

        var source = this.graph.getNode(conn.sourceId);
        var target = this.graph.getNode(conn.targetId);
        if (!source || !target) return;

        var points = this._calcConnectionPoints(source, target);
        var pathData = this._calcBezierPath(points.sx, points.sy, points.tx, points.ty);

        var path = el.querySelector('.connection-path');
        var hitArea = el.querySelector('.connection-hit-area');
        if (path) path.setAttribute('d', pathData);
        if (hitArea) hitArea.setAttribute('d', pathData);

        // Update label position
        var label = el.querySelector('.connection-label');
        if (label) {
            label.setAttribute('x', (points.sx + points.tx) / 2);
            label.setAttribute('y', (points.sy + points.ty) / 2 - 10);
        }
    };

    Renderer.prototype.removeNodeElement = function(nodeId) {
        var el = this._nodeElements[nodeId];
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
        delete this._nodeElements[nodeId];
    };

    Renderer.prototype.removeConnectionElement = function(connId) {
        var el = this._connectionElements[connId];
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
        delete this._connectionElements[connId];
    };

    // ===== Animation =====

    Renderer.prototype.animateResourceFlow = function(flow) {
        var conn = this.graph.getConnection(flow.connectionId);
        if (!conn) return;

        var source = this.graph.getNode(flow.sourceId);
        var target = this.graph.getNode(flow.targetId);
        if (!source || !target) return;

        var points = this._calcConnectionPoints(source, target);

        var token = this._createSVG('circle', {
            'class': 'resource-token',
            'r': 4,
            'cx': points.sx,
            'cy': points.sy
        });
        this.animationsLayer.appendChild(token);

        // Animate along the path
        var duration = 300;
        var startTime = performance.now();
        var self = this;

        function animate(time) {
            var t = Math.min(1, (time - startTime) / duration);
            var ease = t * (2 - t); // easeOut
            var cx = points.sx + (points.tx - points.sx) * ease;
            var cy = points.sy + (points.ty - points.sy) * ease;
            token.setAttribute('cx', cx);
            token.setAttribute('cy', cy);
            token.setAttribute('opacity', 1 - t * 0.5);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                if (token.parentNode) {
                    token.parentNode.removeChild(token);
                }
            }
        }

        requestAnimationFrame(animate);
    };

    Renderer.prototype.pulseNode = function(nodeId) {
        var el = this._nodeElements[nodeId];
        if (!el) return;
        el.classList.remove('node-pulse');
        // Trigger reflow
        void el.offsetWidth;
        el.classList.add('node-pulse');
        setTimeout(function() {
            el.classList.remove('node-pulse');
        }, 300);
    };

    // ===== Selection Rectangle =====

    Renderer.prototype.showSelectionRect = function(x, y, w, h) {
        var existing = this.svg.querySelector('.selection-rect');
        if (existing) existing.parentNode.removeChild(existing);

        var rect = this._createSVG('rect', {
            'class': 'selection-rect',
            'x': Math.min(x, x + w),
            'y': Math.min(y, y + h),
            'width': Math.abs(w),
            'height': Math.abs(h)
        });
        this.canvasGroup.appendChild(rect);
    };

    Renderer.prototype.hideSelectionRect = function() {
        var existing = this.svg.querySelector('.selection-rect');
        if (existing) existing.parentNode.removeChild(existing);
    };

    // ===== Utility =====

    Renderer.prototype._createSVG = function(tag, attrs) {
        var el = document.createElementNS(SVG_NS, tag);
        if (attrs) {
            for (var key in attrs) {
                el.setAttribute(key, attrs[key]);
            }
        }
        return el;
    };

    Renderer.prototype.findNodeAtPoint = function(x, y) {
        var nodes = this.graph.getAllNodes();
        for (var i = nodes.length - 1; i >= 0; i--) {
            var node = nodes[i];
            var bounds = this.getNodeBounds(node);
            var dx = x - node.x;
            var dy = y - node.y;
            if (dx * dx + dy * dy <= bounds.radius * bounds.radius) {
                return node;
            }
        }
        return null;
    };

    Renderer.prototype.findConnectionAtPoint = function(x, y) {
        var conns = this.graph.getAllConnections();
        for (var i = conns.length - 1; i >= 0; i--) {
            var conn = conns[i];
            var source = this.graph.getNode(conn.sourceId);
            var target = this.graph.getNode(conn.targetId);
            if (!source || !target) continue;

            // Simple distance-to-line check
            var dist = this._pointToLineDistance(x, y, source.x, source.y, target.x, target.y);
            if (dist < 10) {
                return conn;
            }
        }
        return null;
    };

    Renderer.prototype._pointToLineDistance = function(px, py, x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));

        var t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        var projX = x1 + t * dx;
        var projY = y1 + t * dy;
        return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
    };

    M.Renderer = Renderer;
    M.NODE_SIZES = NODE_SIZES;

})(window.Machinations);
