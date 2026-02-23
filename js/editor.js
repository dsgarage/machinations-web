/**
 * editor.js - Editor (User Interaction)
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    function Editor(app) {
        this.app = app;
        this.selectedNodeIds = [];
        this.selectedConnectionIds = [];

        // Drag state
        this._dragging = false;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._dragNodeOffsets = [];

        // Connection creation state
        this._connecting = false;
        this._connectionSource = null;

        // Pan state
        this._panning = false;
        this._panStartX = 0;
        this._panStartY = 0;

        // Space key for panning
        this._spaceDown = false;
        this._spaceUsedForPan = false;

        this._init();
    }

    Editor.prototype._init = function() {
        var self = this;
        var svg = this.app.svg;

        // Mouse events on SVG canvas
        svg.addEventListener('mousedown', function(e) { self._onMouseDown(e); });
        svg.addEventListener('mousemove', function(e) { self._onMouseMove(e); });
        svg.addEventListener('mouseup', function(e) { self._onMouseUp(e); });
        svg.addEventListener('wheel', function(e) { self._onWheel(e); });
        svg.addEventListener('contextmenu', function(e) { e.preventDefault(); });

        // Keyboard events
        document.addEventListener('keydown', function(e) { self._onKeyDown(e); });
        document.addEventListener('keyup', function(e) { self._onKeyUp(e); });
    };

    // ===== Mouse Handlers =====

    Editor.prototype._onMouseDown = function(e) {
        if (e.button === 1 || (e.button === 0 && this._spaceDown)) {
            // Middle button or space+click: pan
            this._panning = true;
            this._panStartX = e.clientX;
            this._panStartY = e.clientY;
            this._spaceUsedForPan = true;
            e.preventDefault();
            return;
        }

        if (e.button !== 0) return;

        var worldPos = this.app.renderer.screenToWorld(e.clientX, e.clientY);
        var toolbar = this.app.toolbar;

        if (toolbar.isNodeTool()) {
            this._placeNode(toolbar.currentTool, worldPos.x, worldPos.y);
        } else if (toolbar.isConnectionTool()) {
            this._handleConnectionClick(worldPos, toolbar.currentTool);
        } else if (toolbar.isDeleteTool()) {
            this._handleDeleteClick(worldPos);
        } else if (toolbar.isSelectTool()) {
            this._handleSelectClick(worldPos, e);
        }
    };

    Editor.prototype._onMouseMove = function(e) {
        if (this._panning) {
            var dx = e.clientX - this._panStartX;
            var dy = e.clientY - this._panStartY;
            this.app.renderer.pan(dx, dy);
            this._panStartX = e.clientX;
            this._panStartY = e.clientY;
            return;
        }

        if (this._dragging) {
            var worldPos = this.app.renderer.screenToWorld(e.clientX, e.clientY);
            this._dragNodes(worldPos);
            return;
        }

        if (this._connecting && this._connectionSource) {
            var worldPos = this.app.renderer.screenToWorld(e.clientX, e.clientY);
            var isState = this.app.toolbar.currentTool === 'stateConnection';
            this.app.renderer.showTempConnection(
                this._connectionSource.x,
                this._connectionSource.y,
                worldPos.x, worldPos.y,
                isState
            );
        }
    };

    Editor.prototype._onMouseUp = function(e) {
        if (this._panning) {
            this._panning = false;
            return;
        }

        if (this._dragging) {
            this._dragging = false;
            this.app.saveHistory();
            return;
        }
    };

    Editor.prototype._onWheel = function(e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? -1 : 1;
        this.app.renderer.zoomAt(delta, e.clientX, e.clientY);
    };

    // ===== Keyboard Handlers =====

    Editor.prototype._onKeyDown = function(e) {
        // Don't handle shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        var ctrl = e.ctrlKey || e.metaKey;

        // Ctrl+S: Save
        if (ctrl && e.key === 's') {
            e.preventDefault();
            this.app.io.save();
            return;
        }

        // Ctrl+Z: Undo
        if (ctrl && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            this.app.undo();
            return;
        }

        // Ctrl+Y or Ctrl+Shift+Z: Redo
        if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.app.redo();
            return;
        }

        // Ctrl+A: Select all
        if (ctrl && e.key === 'a') {
            e.preventDefault();
            this.selectAll();
            return;
        }

        // Ctrl+N: New
        if (ctrl && e.key === 'n') {
            e.preventDefault();
            this.app.newDiagram();
            return;
        }

        // Space: Toggle simulation / Pan mode
        if (e.code === 'Space') {
            e.preventDefault();
            if (this._connecting) {
                // Cancel connection
                this._connecting = false;
                this._connectionSource = null;
                this.app.renderer.hideTempConnection();
                return;
            }
            if (!this._spaceDown) {
                this._spaceDown = true;
                this._spaceUsedForPan = false;
            }
            return;
        }

        // S: Step
        if (e.key === 's' || e.key === 'S') {
            this.app.stepSimulation();
            return;
        }

        // Delete/Backspace: Delete selected
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.deleteSelected();
            return;
        }

        // Escape: Cancel current action
        if (e.key === 'Escape') {
            this._cancelAction();
            return;
        }

        // Number keys 1-9: Tool switching
        var toolMap = {
            '1': 'select',
            '2': 'pool',
            '3': 'source',
            '4': 'drain',
            '5': 'converter',
            '6': 'gate',
            '7': 'trader',
            '8': 'register',
            '9': 'endCondition',
            '0': 'chart'
        };

        if (toolMap[e.key]) {
            this.app.toolbar.setTool(toolMap[e.key]);
            return;
        }

        // D: Delay
        if (e.key === 'd' || e.key === 'D') {
            this.app.toolbar.setTool('delay');
            return;
        }

        // Q: Queue
        if (e.key === 'q' || e.key === 'Q') {
            this.app.toolbar.setTool('queue');
            return;
        }

        // R: Resource connection
        if (e.key === 'r' || e.key === 'R') {
            this.app.toolbar.setTool('resourceConnection');
            return;
        }

        // T: State connection
        if (e.key === 't' || e.key === 'T') {
            this.app.toolbar.setTool('stateConnection');
            return;
        }
    };

    Editor.prototype._onKeyUp = function(e) {
        if (e.code === 'Space') {
            // If space was not used for panning, toggle simulation
            if (!this._spaceUsedForPan) {
                this.app.toggleSimulation();
            }
            this._spaceDown = false;
            this._spaceUsedForPan = false;
        }
    };

    // ===== Node Placement =====

    Editor.prototype._placeNode = function(type, x, y) {
        // Snap to grid
        x = Math.round(x / 20) * 20;
        y = Math.round(y / 20) * 20;

        var node = new M.Node(type, x, y);
        this.app.graph.addNode(node);
        this.app.renderer.renderNode(node);
        this.app.updateStatus();
        this.app.saveHistory();

        // Select the new node
        this.clearSelection();
        this.selectNode(node.id);
    };

    // ===== Connection Creation =====

    Editor.prototype._handleConnectionClick = function(worldPos, connType) {
        var node = this.app.renderer.findNodeAtPoint(worldPos.x, worldPos.y);

        if (!this._connecting) {
            // First click: select source
            if (node) {
                this._connecting = true;
                this._connectionSource = node;
                this.app.setStatus('ターゲットノードをクリックしてください (Escでキャンセル)');
            }
        } else {
            // Second click: select target
            if (node && node.id !== this._connectionSource.id) {
                var type = connType === 'stateConnection' ? 'stateConnection' : 'resourceConnection';
                var conn = new M.Connection(type, this._connectionSource.id, node.id);
                this.app.graph.addConnection(conn);
                this.app.renderer.renderConnection(conn);
                this.app.updateStatus();
                this.app.saveHistory();

                // Select the new connection
                this.clearSelection();
                this.selectConnection(conn.id);
            }

            // Reset connection mode
            this._connecting = false;
            this._connectionSource = null;
            this.app.renderer.hideTempConnection();
        }
    };

    // ===== Delete =====

    Editor.prototype._handleDeleteClick = function(worldPos) {
        var node = this.app.renderer.findNodeAtPoint(worldPos.x, worldPos.y);
        if (node) {
            this._deleteNode(node.id);
            return;
        }

        var conn = this.app.renderer.findConnectionAtPoint(worldPos.x, worldPos.y);
        if (conn) {
            this._deleteConnection(conn.id);
        }
    };

    Editor.prototype._deleteNode = function(nodeId) {
        var removedConns = this.app.graph.removeNode(nodeId);
        this.app.renderer.removeNodeElement(nodeId);
        for (var i = 0; i < removedConns.length; i++) {
            this.app.renderer.removeConnectionElement(removedConns[i]);
        }
        this.app.propertiesPanel.clear();
        this.app.updateStatus();
        this.app.saveHistory();

        // Remove from selection
        var idx = this.selectedNodeIds.indexOf(nodeId);
        if (idx >= 0) this.selectedNodeIds.splice(idx, 1);
    };

    Editor.prototype._deleteConnection = function(connId) {
        this.app.graph.removeConnection(connId);
        this.app.renderer.removeConnectionElement(connId);
        this.app.propertiesPanel.clear();
        this.app.updateStatus();
        this.app.saveHistory();

        var idx = this.selectedConnectionIds.indexOf(connId);
        if (idx >= 0) this.selectedConnectionIds.splice(idx, 1);
    };

    Editor.prototype.deleteSelected = function() {
        var self = this;

        // Delete selected connections first
        var connIds = this.selectedConnectionIds.slice();
        connIds.forEach(function(cid) {
            self._deleteConnection(cid);
        });

        // Then delete selected nodes
        var nodeIds = this.selectedNodeIds.slice();
        nodeIds.forEach(function(nid) {
            self._deleteNode(nid);
        });

        this.clearSelection();
    };

    // ===== Selection =====

    Editor.prototype._handleSelectClick = function(worldPos, e) {
        var node = this.app.renderer.findNodeAtPoint(worldPos.x, worldPos.y);

        if (node) {
            // Check if interactive node during simulation
            if (this.app.engine && this.app.engine.running &&
                node.properties.activationMode === 'interactive') {
                this.app.engine.activateInteractiveNode(node.id);
                return;
            }

            if (!e.shiftKey) {
                this.clearSelection();
            }
            this.selectNode(node.id);

            // Start dragging
            this._dragging = true;
            this._dragStartX = worldPos.x;
            this._dragStartY = worldPos.y;
            this._dragNodeOffsets = [];

            for (var i = 0; i < this.selectedNodeIds.length; i++) {
                var n = this.app.graph.getNode(this.selectedNodeIds[i]);
                if (n) {
                    this._dragNodeOffsets.push({
                        id: n.id,
                        offsetX: n.x - worldPos.x,
                        offsetY: n.y - worldPos.y
                    });
                }
            }
            return;
        }

        var conn = this.app.renderer.findConnectionAtPoint(worldPos.x, worldPos.y);
        if (conn) {
            if (!e.shiftKey) {
                this.clearSelection();
            }
            this.selectConnection(conn.id);
            return;
        }

        // Click on empty space
        this.clearSelection();
    };

    Editor.prototype.selectNode = function(nodeId) {
        if (this.selectedNodeIds.indexOf(nodeId) < 0) {
            this.selectedNodeIds.push(nodeId);
        }
        this.app.renderer.setNodeSelected(nodeId, true);

        var node = this.app.graph.getNode(nodeId);
        if (node) {
            this.app.propertiesPanel.showNode(node);
        }
    };

    Editor.prototype.selectConnection = function(connId) {
        if (this.selectedConnectionIds.indexOf(connId) < 0) {
            this.selectedConnectionIds.push(connId);
        }
        this.app.renderer.setConnectionSelected(connId, true);

        var conn = this.app.graph.getConnection(connId);
        if (conn) {
            this.app.propertiesPanel.showConnection(conn);
        }
    };

    Editor.prototype.clearSelection = function() {
        this.app.renderer.clearSelection();
        this.selectedNodeIds = [];
        this.selectedConnectionIds = [];
        this.app.propertiesPanel.clear();
    };

    Editor.prototype.selectAll = function() {
        var self = this;
        this.clearSelection();
        var nodes = this.app.graph.getAllNodes();
        nodes.forEach(function(n) {
            self.selectedNodeIds.push(n.id);
            self.app.renderer.setNodeSelected(n.id, true);
        });
        var conns = this.app.graph.getAllConnections();
        conns.forEach(function(c) {
            self.selectedConnectionIds.push(c.id);
            self.app.renderer.setConnectionSelected(c.id, true);
        });
    };

    // ===== Drag =====

    Editor.prototype._dragNodes = function(worldPos) {
        for (var i = 0; i < this._dragNodeOffsets.length; i++) {
            var offset = this._dragNodeOffsets[i];
            var node = this.app.graph.getNode(offset.id);
            if (!node) continue;

            // Snap to grid
            node.x = Math.round((worldPos.x + offset.offsetX) / 20) * 20;
            node.y = Math.round((worldPos.y + offset.offsetY) / 20) * 20;

            this.app.renderer.updateNode(node);

            // Update connections
            var conns = this.app.graph.getAllConnections();
            for (var j = 0; j < conns.length; j++) {
                if (conns[j].sourceId === node.id || conns[j].targetId === node.id) {
                    this.app.renderer.updateConnection(conns[j]);
                }
            }
        }
    };

    // ===== Cancel =====

    Editor.prototype._cancelAction = function() {
        this._connecting = false;
        this._connectionSource = null;
        this._dragging = false;
        this.app.renderer.hideTempConnection();
        this.app.toolbar.setTool('select');
        this.clearSelection();
    };

    M.Editor = Editor;

})(window.Machinations);
