/**
 * graph.js - Data Model (Nodes and Connections)
 * Machinations Web Simulator
 */

window.Machinations = window.Machinations || {};

(function(M) {
    'use strict';

    // ===== ID Generator =====
    let _idCounter = 0;
    function generateId(prefix) {
        _idCounter++;
        return prefix + '_' + Date.now().toString(36) + '_' + _idCounter;
    }

    // ===== Node Type Definitions =====
    var NODE_TYPES = {
        pool: {
            name: 'プール',
            shape: 'circle',
            fill: '#ffffff',
            stroke: '#333333',
            defaults: {
                capacity: -1,
                startValue: 0,
                activationMode: 'passive',
                pullMode: 'pull'
            }
        },
        source: {
            name: 'ソース',
            shape: 'triangleUp',
            fill: '#e8f5e9',
            stroke: '#4caf50',
            defaults: {
                activationMode: 'automatic',
                production: 1
            }
        },
        drain: {
            name: 'ドレイン',
            shape: 'triangleDown',
            fill: '#ffebee',
            stroke: '#f44336',
            defaults: {
                activationMode: 'automatic',
                consumption: 1
            }
        },
        converter: {
            name: 'コンバーター',
            shape: 'triangleRight',
            fill: '#fff8e1',
            stroke: '#ff9800',
            defaults: {
                inputRate: 1,
                outputRate: 1,
                activationMode: 'passive'
            }
        },
        gate: {
            name: 'ゲート',
            shape: 'diamond',
            fill: '#f3e5f5',
            stroke: '#9c27b0',
            defaults: {
                gateType: 'probabilistic',
                distribution: '',
                activationMode: 'passive'
            }
        },
        trader: {
            name: 'トレーダー',
            shape: 'hexagon',
            fill: '#fff3e0',
            stroke: '#ff5722',
            defaults: {
                exchangeRate: 1,
                activationMode: 'passive'
            }
        },
        register: {
            name: 'レジスター',
            shape: 'rect',
            fill: '#f5f5f5',
            stroke: '#9e9e9e',
            defaults: {
                value: 0,
                formula: ''
            }
        },
        endCondition: {
            name: 'エンドコンディション',
            shape: 'doubleCircle',
            fill: '#ffffff',
            stroke: '#f44336',
            defaults: {
                condition: ''
            }
        }
    };

    // ===== Connection Type Definitions =====
    var CONNECTION_TYPES = {
        resourceConnection: {
            name: 'リソース接続',
            style: 'solid',
            defaults: {
                rate: 1,
                label: ''
            }
        },
        stateConnection: {
            name: '状態接続',
            style: 'dashed',
            defaults: {
                stateType: 'labelModifier',
                formula: '',
                condition: '',
                label: ''
            }
        }
    };

    var STATE_CONNECTION_TYPES = {
        labelModifier: { name: 'ラベル修飾子', marker: 'label' },
        nodeModifier: { name: 'ノード修飾子', marker: 'node' },
        trigger: { name: 'トリガー', marker: 'trigger' },
        activator: { name: 'アクティベーター', marker: 'activator' }
    };

    var ACTIVATION_MODES = {
        automatic: { name: '自動', symbol: '*' },
        interactive: { name: 'インタラクティブ', symbol: '◎' },
        passive: { name: '受動', symbol: '' },
        onStart: { name: '開始時', symbol: 'S' }
    };

    var PULL_MODES = {
        pull: { name: 'プル', symbol: '↓' },
        push: { name: 'プッシュ', symbol: '↑' },
        any: { name: 'いずれか', symbol: '↕' }
    };

    // ===== Node Class =====
    function Node(type, x, y, properties) {
        var typeDef = NODE_TYPES[type];
        if (!typeDef) throw new Error('Unknown node type: ' + type);

        this.id = generateId('n');
        this.type = type;
        this.x = x || 0;
        this.y = y || 0;
        this.properties = {};

        // Apply defaults
        var defaults = typeDef.defaults;
        for (var key in defaults) {
            this.properties[key] = defaults[key];
        }

        // Apply custom properties
        if (properties) {
            for (var key in properties) {
                this.properties[key] = properties[key];
            }
        }

        // Default name
        if (!this.properties.name) {
            this.properties.name = typeDef.name;
        }

        // Runtime state
        this.resources = this.properties.startValue || 0;
        this.activated = false;
        this.fired = false;
    }

    Node.prototype.getTypeDef = function() {
        return NODE_TYPES[this.type];
    };

    Node.prototype.canAcceptResource = function(amount) {
        if (this.type === 'drain') return true;
        if (this.type === 'source') return false;
        var cap = this.properties.capacity;
        if (cap === -1) return true;
        return this.resources + amount <= cap;
    };

    Node.prototype.addResources = function(amount) {
        this.resources += amount;
        if (this.properties.capacity !== undefined && this.properties.capacity !== -1) {
            this.resources = Math.min(this.resources, this.properties.capacity);
        }
    };

    Node.prototype.removeResources = function(amount) {
        if (this.type === 'source') return amount;
        var removed = Math.min(this.resources, amount);
        this.resources -= removed;
        return removed;
    };

    Node.prototype.toJSON = function() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            properties: JSON.parse(JSON.stringify(this.properties))
        };
    };

    Node.fromJSON = function(data) {
        var node = new Node(data.type, data.x, data.y, data.properties);
        node.id = data.id;
        node.resources = data.properties.startValue || 0;
        return node;
    };

    // ===== Connection Class =====
    function Connection(type, sourceId, targetId, properties) {
        var typeDef = CONNECTION_TYPES[type];
        if (!typeDef) throw new Error('Unknown connection type: ' + type);

        this.id = generateId('c');
        this.type = type;
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.properties = {};

        // Apply defaults
        var defaults = typeDef.defaults;
        for (var key in defaults) {
            this.properties[key] = defaults[key];
        }

        // Apply custom properties
        if (properties) {
            for (var key in properties) {
                this.properties[key] = properties[key];
            }
        }

        // Runtime
        this.currentRate = this.properties.rate || 0;
        this.active = true;
    }

    Connection.prototype.getTypeDef = function() {
        return CONNECTION_TYPES[this.type];
    };

    Connection.prototype.toJSON = function() {
        return {
            id: this.id,
            type: this.type,
            source: this.sourceId,
            target: this.targetId,
            properties: JSON.parse(JSON.stringify(this.properties))
        };
    };

    Connection.fromJSON = function(data) {
        var conn = new Connection(data.type, data.source, data.target, data.properties);
        conn.id = data.id;
        return conn;
    };

    // ===== Graph Class =====
    function Graph() {
        this.nodes = {};
        this.connections = {};
        this.stepCount = 0;
    }

    Graph.prototype.addNode = function(node) {
        this.nodes[node.id] = node;
        return node;
    };

    Graph.prototype.removeNode = function(nodeId) {
        var self = this;
        // Remove all connections to/from this node
        var toRemove = [];
        for (var cid in this.connections) {
            var conn = this.connections[cid];
            if (conn.sourceId === nodeId || conn.targetId === nodeId) {
                toRemove.push(cid);
            }
        }
        toRemove.forEach(function(cid) {
            delete self.connections[cid];
        });
        delete this.nodes[nodeId];
        return toRemove;
    };

    Graph.prototype.addConnection = function(connection) {
        this.connections[connection.id] = connection;
        return connection;
    };

    Graph.prototype.removeConnection = function(connectionId) {
        delete this.connections[connectionId];
    };

    Graph.prototype.getNode = function(nodeId) {
        return this.nodes[nodeId] || null;
    };

    Graph.prototype.getConnection = function(connectionId) {
        return this.connections[connectionId] || null;
    };

    Graph.prototype.getIncomingConnections = function(nodeId, type) {
        var result = [];
        for (var cid in this.connections) {
            var conn = this.connections[cid];
            if (conn.targetId === nodeId) {
                if (!type || conn.type === type) {
                    result.push(conn);
                }
            }
        }
        return result;
    };

    Graph.prototype.getOutgoingConnections = function(nodeId, type) {
        var result = [];
        for (var cid in this.connections) {
            var conn = this.connections[cid];
            if (conn.sourceId === nodeId) {
                if (!type || conn.type === type) {
                    result.push(conn);
                }
            }
        }
        return result;
    };

    Graph.prototype.getNodeCount = function() {
        return Object.keys(this.nodes).length;
    };

    Graph.prototype.getConnectionCount = function() {
        return Object.keys(this.connections).length;
    };

    Graph.prototype.getTotalResources = function() {
        var total = 0;
        for (var nid in this.nodes) {
            var node = this.nodes[nid];
            if (typeof node.resources === 'number' && isFinite(node.resources)) {
                total += node.resources;
            }
        }
        return total;
    };

    Graph.prototype.reset = function() {
        for (var nid in this.nodes) {
            var node = this.nodes[nid];
            node.resources = node.properties.startValue || 0;
            node.activated = false;
            node.fired = false;
        }
        for (var cid in this.connections) {
            var conn = this.connections[cid];
            conn.currentRate = conn.properties.rate || 0;
            conn.active = true;
        }
        this.stepCount = 0;
    };

    Graph.prototype.toJSON = function() {
        var nodesArr = [];
        for (var nid in this.nodes) {
            nodesArr.push(this.nodes[nid].toJSON());
        }
        var connsArr = [];
        for (var cid in this.connections) {
            connsArr.push(this.connections[cid].toJSON());
        }
        return {
            name: 'machinations-diagram',
            nodes: nodesArr,
            connections: connsArr
        };
    };

    Graph.fromJSON = function(data) {
        var graph = new Graph();
        if (data.nodes) {
            data.nodes.forEach(function(nd) {
                var node = Node.fromJSON(nd);
                graph.nodes[node.id] = node;
            });
        }
        if (data.connections) {
            data.connections.forEach(function(cd) {
                var conn = Connection.fromJSON(cd);
                graph.connections[conn.id] = conn;
            });
        }
        return graph;
    };

    Graph.prototype.getAllNodes = function() {
        var arr = [];
        for (var nid in this.nodes) {
            arr.push(this.nodes[nid]);
        }
        return arr;
    };

    Graph.prototype.getAllConnections = function() {
        var arr = [];
        for (var cid in this.connections) {
            arr.push(this.connections[cid]);
        }
        return arr;
    };

    // ===== Undo/Redo History =====
    function History(maxSize) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize || 50;
    }

    History.prototype.push = function(state) {
        this.undoStack.push(JSON.stringify(state));
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    };

    History.prototype.undo = function(currentState) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(JSON.stringify(currentState));
        var state = this.undoStack.pop();
        return JSON.parse(state);
    };

    History.prototype.redo = function(currentState) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(JSON.stringify(currentState));
        var state = this.redoStack.pop();
        return JSON.parse(state);
    };

    History.prototype.canUndo = function() {
        return this.undoStack.length > 0;
    };

    History.prototype.canRedo = function() {
        return this.redoStack.length > 0;
    };

    // ===== Exports =====
    M.NODE_TYPES = NODE_TYPES;
    M.CONNECTION_TYPES = CONNECTION_TYPES;
    M.STATE_CONNECTION_TYPES = STATE_CONNECTION_TYPES;
    M.ACTIVATION_MODES = ACTIVATION_MODES;
    M.PULL_MODES = PULL_MODES;
    M.Node = Node;
    M.Connection = Connection;
    M.Graph = Graph;
    M.History = History;
    M.generateId = generateId;

})(window.Machinations);
