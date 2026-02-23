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
        endCondition: { radius: 30 },
        chart: { width: 120, height: 80 },
        delay: { width: 60, height: 40 },
        queue: { width: 60, height: 40 },
        textLabel: { width: 100, height: 30 },
        group: { width: 200, height: 150 }
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
        this.updateMinimap();
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
        this.updateMinimap();
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
        if (node.type === 'pool' || node.type === 'register' || node.type === 'delay' || node.type === 'queue') {
            var valueText = this._createSVG('text', {
                'class': 'node-value',
                'x': 0,
                'y': 5,
                'text-anchor': 'middle'
            });
            if (node.type === 'register') {
                valueText.textContent = node.properties.value || 0;
            } else if (node.type === 'delay') {
                valueText.textContent = node._delayQueue ? node._delayQueue.reduce(function(s, e) { return s + e.amount; }, 0) : 0;
            } else if (node.type === 'queue') {
                valueText.textContent = node._fifoQueue ? node._fifoQueue.reduce(function(s, e) { return s + e; }, 0) : 0;
            } else {
                valueText.textContent = Math.round(node.resources);
            }
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

            case 'chartRect': {
                var cw = NODE_SIZES.chart.width;
                var ch = NODE_SIZES.chart.height;
                shape = this._createSVG('g', { 'class': 'node-shape' });
                var bg = this._createSVG('rect', {
                    'x': -cw / 2, 'y': -ch / 2,
                    'width': cw, 'height': ch,
                    'rx': 6,
                    'fill': fill,
                    'stroke': stroke,
                    'stroke-width': 2
                });
                shape.appendChild(bg);
                // Small chart icon
                var iconPath = this._createSVG('path', {
                    'd': 'M' + (-cw/2 + 8) + ',' + (ch/2 - 8) +
                         ' L' + (-cw/2 + 8) + ',' + (-ch/2 + 8) +
                         ' M' + (-cw/2 + 8) + ',' + (ch/2 - 8) +
                         ' L' + (cw/2 - 8) + ',' + (ch/2 - 8),
                    'fill': 'none',
                    'stroke': stroke,
                    'stroke-width': 1,
                    'opacity': 0.3
                });
                shape.appendChild(iconPath);
                break;
            }

            case 'delayRect': {
                var dw = NODE_SIZES.delay.width;
                var dh = NODE_SIZES.delay.height;
                shape = this._createSVG('g', { 'class': 'node-shape' });
                var bg = this._createSVG('rect', {
                    'x': -dw/2, 'y': -dh/2, 'width': dw, 'height': dh,
                    'rx': 6, 'fill': fill, 'stroke': stroke, 'stroke-width': 2
                });
                shape.appendChild(bg);
                // Delay indicator line
                var line = this._createSVG('line', {
                    'x1': dw/2 - 12, 'y1': -dh/2 + 4, 'x2': dw/2 - 12, 'y2': dh/2 - 4,
                    'stroke': stroke, 'stroke-width': 1.5, 'opacity': 0.5
                });
                shape.appendChild(line);
                break;
            }

            case 'queueRect': {
                var qw = NODE_SIZES.queue.width;
                var qh = NODE_SIZES.queue.height;
                shape = this._createSVG('g', { 'class': 'node-shape' });
                var bg = this._createSVG('rect', {
                    'x': -qw/2, 'y': -qh/2, 'width': qw, 'height': qh,
                    'rx': 6, 'fill': fill, 'stroke': stroke, 'stroke-width': 2
                });
                shape.appendChild(bg);
                // FIFO indicator (3 vertical lines)
                for (var qi = 0; qi < 3; qi++) {
                    var lx = -qw/2 + 12 + qi * 12;
                    var ql = this._createSVG('line', {
                        'x1': lx, 'y1': -qh/2 + 6, 'x2': lx, 'y2': qh/2 - 6,
                        'stroke': stroke, 'stroke-width': 1, 'opacity': 0.3
                    });
                    shape.appendChild(ql);
                }
                break;
            }

            case 'textShape': {
                var tw = NODE_SIZES.textLabel.width;
                var th = NODE_SIZES.textLabel.height;
                shape = this._createSVG('rect', {
                    'class': 'node-shape',
                    'x': -tw/2, 'y': -th/2, 'width': tw, 'height': th,
                    'fill': 'transparent', 'stroke': stroke,
                    'stroke-width': 1, 'stroke-dasharray': '4,2', 'opacity': 0.3
                });
                break;
            }

            case 'groupRect': {
                var gw = NODE_SIZES.group.width;
                var gh = NODE_SIZES.group.height;
                shape = this._createSVG('rect', {
                    'class': 'node-shape',
                    'x': -gw/2, 'y': -gh/2, 'width': gw, 'height': gh,
                    'rx': 8, 'fill': fill, 'stroke': stroke,
                    'stroke-width': 1.5, 'stroke-dasharray': '8,4'
                });
                break;
            }

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
        var w, h, r;
        if (sizes.radius) {
            r = sizes.radius;
            w = h = r * 2;
        } else {
            w = sizes.width || 40;
            h = sizes.height || 40;
            r = Math.max(w, h) / 2;
        }
        return {
            x: node.x - w / 2,
            y: node.y - h / 2,
            width: w,
            height: h,
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

    Renderer.prototype._calcBezierControlPoints = function(sx, sy, tx, ty) {
        var dx = tx - sx;
        var dy = ty - sy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var curvature = Math.min(dist * 0.2, 50);

        var cp1x, cp1y, cp2x, cp2y;
        if (Math.abs(dx) > Math.abs(dy)) {
            cp1x = sx + curvature; cp1y = sy;
            cp2x = tx - curvature; cp2y = ty;
        } else {
            cp1x = sx; cp1y = sy + curvature;
            cp2x = tx; cp2y = ty - curvature;
        }
        return { p0x: sx, p0y: sy, p1x: cp1x, p1y: cp1y, p2x: cp2x, p2y: cp2y, p3x: tx, p3y: ty };
    };

    Renderer.prototype._calcBezierPath = function(sx, sy, tx, ty) {
        var b = this._calcBezierControlPoints(sx, sy, tx, ty);
        return 'M' + b.p0x + ',' + b.p0y + ' C' + b.p1x + ',' + b.p1y + ' ' + b.p2x + ',' + b.p2y + ' ' + b.p3x + ',' + b.p3y;
    };

    Renderer.prototype._evalBezier = function(b, t) {
        var u = 1 - t;
        var uu = u * u;
        var uuu = uu * u;
        var tt = t * t;
        var ttt = tt * t;
        return {
            x: uuu * b.p0x + 3 * uu * t * b.p1x + 3 * u * tt * b.p2x + ttt * b.p3x,
            y: uuu * b.p0y + 3 * uu * t * b.p1y + 3 * u * tt * b.p2y + ttt * b.p3y
        };
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
            } else if (node.type === 'delay') {
                valueText.textContent = node._delayQueue ? node._delayQueue.reduce(function(s, e) { return s + e.amount; }, 0) : 0;
            } else if (node.type === 'queue') {
                valueText.textContent = node._fifoQueue ? node._fifoQueue.reduce(function(s, e) { return s + e; }, 0) : 0;
            } else {
                valueText.textContent = Math.round(node.resources);
            }
        }

        // Update name label
        var nameLabel = el.querySelector('.node-label');
        if (nameLabel) {
            nameLabel.textContent = node.properties.name || '';
        }

        // Update chart mini-graph
        if (node.type === 'chart' && node.chartData) {
            this._updateChartGraph(el, node);
        }
    };

    Renderer.prototype._updateChartGraph = function(el, node) {
        // Remove old chart lines
        var oldLines = el.querySelectorAll('.chart-line');
        for (var i = 0; i < oldLines.length; i++) {
            oldLines[i].parentNode.removeChild(oldLines[i]);
        }

        var cw = NODE_SIZES.chart.width;
        var ch = NODE_SIZES.chart.height;
        var padX = 10;
        var padY = 12;
        var plotW = cw - padX * 2;
        var plotH = ch - padY * 2;

        var colors = ['#1976d2', '#e53935', '#43a047', '#ff9800', '#9c27b0', '#00bcd4'];
        var colorIdx = 0;

        var chartData = node.chartData;
        if (!chartData) return;

        // Find global min/max for scaling
        var globalMin = Infinity, globalMax = -Infinity;
        for (var name in chartData) {
            var data = chartData[name];
            for (var j = 0; j < data.length; j++) {
                if (data[j] < globalMin) globalMin = data[j];
                if (data[j] > globalMax) globalMax = data[j];
            }
        }
        if (globalMin === Infinity) return;
        if (globalMax === globalMin) { globalMax = globalMin + 1; }

        // Draw each series
        var shapeGroup = el.querySelector('.node-shape');
        var drawTarget = shapeGroup || el;

        for (var name in chartData) {
            var data = chartData[name];
            if (data.length < 2) continue;

            var points = [];
            for (var j = 0; j < data.length; j++) {
                var px = -cw/2 + padX + (j / (data.length - 1)) * plotW;
                var py = ch/2 - padY - ((data[j] - globalMin) / (globalMax - globalMin)) * plotH;
                points.push(px + ',' + py);
            }

            var polyline = this._createSVG('polyline', {
                'class': 'chart-line',
                'points': points.join(' '),
                'fill': 'none',
                'stroke': colors[colorIdx % colors.length],
                'stroke-width': 1.5,
                'stroke-linejoin': 'round'
            });
            drawTarget.appendChild(polyline);
            colorIdx++;
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
        // Limit concurrent animation tokens
        if (this._animationTokens.length >= 60) return;

        var conn = this.graph.getConnection(flow.connectionId);
        if (!conn) return;

        var source = this.graph.getNode(flow.sourceId);
        var target = this.graph.getNode(flow.targetId);
        if (!source || !target) return;

        var points = this._calcConnectionPoints(source, target);
        var bezier = this._calcBezierControlPoints(points.sx, points.sy, points.tx, points.ty);

        // Show tokens matching actual amount (cap at 12)
        var count = Math.min(Math.max(1, Math.round(flow.amount)), 12);
        var duration = 500;
        var self = this;
        var tokenColor = (flow.color && flow.color !== 'default') ? flow.color : null;

        // Launch all tokens at once, each with a slight offset along the curve
        for (var i = 0; i < count; i++) {
            self._launchToken(bezier, duration, points.tx, points.ty, i, count, tokenColor);
        }
    };

    Renderer.prototype._launchToken = function(bezier, duration, endX, endY, index, total, tokenColor) {
        if (this._animationTokens.length >= 60) return;

        // Cluster offset: tokens start slightly behind each other on the curve
        // This creates a "packet" effect rather than a spread-out trail
        var clusterSpread = 0.06; // 6% of curve length for the whole group
        var offset = (total > 1) ? (index / (total - 1)) * clusterSpread : 0;

        var token = this._createSVG('circle', {
            'class': 'resource-token',
            'r': 3.5,
            'cx': bezier.p0x,
            'cy': bezier.p0y
        });
        if (tokenColor) {
            token.setAttribute('fill', tokenColor);
            token.setAttribute('stroke', this._darkenColor(tokenColor));
        }
        this.animationsLayer.appendChild(token);
        this._animationTokens.push(token);

        var startTime = performance.now();
        var self = this;
        var isLast = (index === total - 1);

        function animate(time) {
            var t = Math.min(1, (time - startTime) / duration);
            // Ease in-out cubic
            var ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Apply cluster offset: later tokens trail slightly behind
            var curveT = Math.max(0, Math.min(1, ease - offset + offset * ease));

            var pt = self._evalBezier(bezier, curveT);
            token.setAttribute('cx', pt.x);
            token.setAttribute('cy', pt.y);

            // Scale: grow slightly mid-flight
            var scale = 1 + 0.2 * Math.sin(t * Math.PI);
            token.setAttribute('r', 3.5 * scale);
            token.setAttribute('opacity', t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Only the last token in cluster triggers burst
                if (isLast) {
                    self._burstEffect(endX, endY, total);
                }
                if (token.parentNode) {
                    token.parentNode.removeChild(token);
                }
                var idx = self._animationTokens.indexOf(token);
                if (idx >= 0) self._animationTokens.splice(idx, 1);
            }
        }

        requestAnimationFrame(animate);
    };

    Renderer.prototype._burstEffect = function(x, y, count) {
        // Scale burst size with token count
        var maxR = 6 + Math.min(count || 1, 8) * 1.5;
        var ring = this._createSVG('circle', {
            'class': 'burst-ring',
            'cx': x, 'cy': y, 'r': 3,
            'fill': 'none',
            'stroke': '#ff9800',
            'stroke-width': 2,
            'opacity': 0.9
        });
        this.animationsLayer.appendChild(ring);

        var startTime = performance.now();
        var dur = 300;

        function anim(time) {
            var t = Math.min(1, (time - startTime) / dur);
            var r = 3 + maxR * t;
            ring.setAttribute('r', r);
            ring.setAttribute('opacity', 0.9 * (1 - t));
            ring.setAttribute('stroke-width', 2 * (1 - t));

            if (t < 1) {
                requestAnimationFrame(anim);
            } else {
                if (ring.parentNode) ring.parentNode.removeChild(ring);
            }
        }

        requestAnimationFrame(anim);
    };

    Renderer.prototype.pulseNode = function(nodeId) {
        // Lightweight pulse: no forced reflow
        var el = this._nodeElements[nodeId];
        if (!el) return;
        var shape = el.querySelector('.node-shape');
        if (!shape) return;
        shape.style.opacity = '0.7';
        setTimeout(function() {
            shape.style.opacity = '';
        }, 150);
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

    // ===== Color Helpers =====

    Renderer.prototype._darkenColor = function(hex) {
        // Darken a hex color by 30%
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '#000000';
        var r = Math.max(0, Math.round(parseInt(result[1], 16) * 0.7));
        var g = Math.max(0, Math.round(parseInt(result[2], 16) * 0.7));
        var b = Math.max(0, Math.round(parseInt(result[3], 16) * 0.7));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    // ===== Minimap =====

    Renderer.prototype.updateMinimap = function() {
        var canvas = document.getElementById('minimap-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var mw = canvas.width;
        var mh = canvas.height;

        ctx.clearRect(0, 0, mw, mh);

        var nodes = this.graph.getAllNodes();
        if (nodes.length === 0) return;

        // Find bounds
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x > maxX) maxX = n.x;
            if (n.y > maxY) maxY = n.y;
        }

        // Add padding
        var pad = 80;
        minX -= pad; minY -= pad;
        maxX += pad; maxY += pad;

        var rangeX = maxX - minX || 1;
        var rangeY = maxY - minY || 1;
        var scale = Math.min(mw / rangeX, mh / rangeY);

        // Draw nodes as small dots
        var typeColors = {
            pool: '#4caf50',
            source: '#4caf50',
            drain: '#f44336',
            converter: '#ff9800',
            gate: '#9c27b0',
            trader: '#ff5722',
            register: '#9e9e9e',
            endCondition: '#f44336',
            chart: '#1976d2',
            delay: '#00838f',
            queue: '#c62828',
            textLabel: '#666666',
            group: '#3f51b5'
        };

        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            var px = (n.x - minX) * scale;
            var py = (n.y - minY) * scale;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = typeColors[n.type] || '#666';
            ctx.fill();
        }

        // Draw connections as thin lines
        var conns = this.graph.getAllConnections();
        ctx.strokeStyle = 'rgba(128,128,128,0.4)';
        ctx.lineWidth = 0.5;
        for (var i = 0; i < conns.length; i++) {
            var conn = conns[i];
            var src = this.graph.getNode(conn.sourceId);
            var tgt = this.graph.getNode(conn.targetId);
            if (!src || !tgt) continue;
            ctx.beginPath();
            ctx.moveTo((src.x - minX) * scale, (src.y - minY) * scale);
            ctx.lineTo((tgt.x - minX) * scale, (tgt.y - minY) * scale);
            ctx.stroke();
        }

        // Draw viewport rectangle
        var svgRect = this.svg.getBoundingClientRect();
        var vpLeft = (0 - this.panX) / this.zoom;
        var vpTop = (0 - this.panY) / this.zoom;
        var vpRight = (svgRect.width - this.panX) / this.zoom;
        var vpBottom = (svgRect.height - this.panY) / this.zoom;

        var rx = (vpLeft - minX) * scale;
        var ry = (vpTop - minY) * scale;
        var rw = (vpRight - vpLeft) * scale;
        var rh = (vpBottom - vpTop) * scale;

        ctx.strokeStyle = 'rgba(33,150,243,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, rh);
    };

    M.Renderer = Renderer;
    M.NODE_SIZES = NODE_SIZES;

})(window.Machinations);
