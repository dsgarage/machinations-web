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
            name: '',
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
            name: '',
            shape: 'triangleUp',
            fill: '#e8f5e9',
            stroke: '#4caf50',
            defaults: {
                activationMode: 'automatic',
                production: 1
            }
        },
        drain: {
            name: '',
            shape: 'triangleDown',
            fill: '#ffebee',
            stroke: '#f44336',
            defaults: {
                activationMode: 'automatic',
                consumption: 1
            }
        },
        converter: {
            name: '',
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
            name: '',
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
            name: '',
            shape: 'hexagon',
            fill: '#fff3e0',
            stroke: '#ff5722',
            defaults: {
                exchangeRate: 1,
                activationMode: 'passive'
            }
        },
        register: {
            name: '',
            shape: 'rect',
            fill: '#f5f5f5',
            stroke: '#9e9e9e',
            defaults: {
                value: 0,
                formula: ''
            }
        },
        endCondition: {
            name: '',
            shape: 'doubleCircle',
            fill: '#ffffff',
            stroke: '#f44336',
            defaults: {
                condition: ''
            }
        },
        chart: {
            name: '',
            shape: 'chartRect',
            fill: '#e3f2fd',
            stroke: '#1976d2',
            defaults: {
                maxDataPoints: 100,
                activationMode: 'passive'
            }
        },
        delay: {
            name: '',
            shape: 'delayRect',
            fill: '#e0f7fa',
            stroke: '#00838f',
            defaults: {
                delay: 3,
                activationMode: 'passive'
            }
        },
        queue: {
            name: '',
            shape: 'queueRect',
            fill: '#fce4ec',
            stroke: '#c62828',
            defaults: {
                capacity: -1,
                activationMode: 'automatic'
            }
        },
        textLabel: {
            name: '',
            shape: 'textShape',
            fill: 'transparent',
            stroke: '#999999',
            defaults: {
                text: ''
            }
        },
        group: {
            name: '',
            shape: 'groupRect',
            fill: 'rgba(100,100,200,0.05)',
            stroke: '#3f51b5',
            defaults: {
                name: ''
            }
        }
    };

    // ===== Connection Type Definitions =====
    var CONNECTION_TYPES = {
        resourceConnection: {
            name: '',
            style: 'solid',
            defaults: {
                rate: 1,
                label: ''
            }
        },
        stateConnection: {
            name: '',
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
        labelModifier: { name: '', marker: 'label' },
        nodeModifier: { name: '', marker: 'node' },
        trigger: { name: '', marker: 'trigger' },
        activator: { name: '', marker: 'activator' }
    };

    var ACTIVATION_MODES = {
        automatic: { name: '', symbol: '*' },
        interactive: { name: '', symbol: '◎' },
        passive: { name: '', symbol: '' },
        onStart: { name: '', symbol: 'S' }
    };

    var PULL_MODES = {
        pull: { name: '', symbol: '↓' },
        push: { name: '', symbol: '↑' },
        pushAll: { name: '', symbol: '↑&' },
        any: { name: '', symbol: '↕' }
    };

    function refreshTypeLabels() {
        var t = M.t;
        NODE_TYPES.pool.name = t('node.pool');
        NODE_TYPES.source.name = t('node.source');
        NODE_TYPES.drain.name = t('node.drain');
        NODE_TYPES.converter.name = t('node.converter');
        NODE_TYPES.gate.name = t('node.gate');
        NODE_TYPES.trader.name = t('node.trader');
        NODE_TYPES.register.name = t('node.register');
        NODE_TYPES.endCondition.name = t('node.endCondition');
        NODE_TYPES.chart.name = t('node.chart');
        NODE_TYPES.delay.name = t('node.delay');
        NODE_TYPES.queue.name = t('node.queue');
        NODE_TYPES.textLabel.name = t('node.textLabel');
        NODE_TYPES.group.name = t('node.group');
        NODE_TYPES.group.defaults.name = t('node.group');

        CONNECTION_TYPES.resourceConnection.name = t('conn.resource');
        CONNECTION_TYPES.stateConnection.name = t('conn.state');

        STATE_CONNECTION_TYPES.labelModifier.name = t('state.labelModifier');
        STATE_CONNECTION_TYPES.nodeModifier.name = t('state.nodeModifier');
        STATE_CONNECTION_TYPES.trigger.name = t('state.trigger');
        STATE_CONNECTION_TYPES.activator.name = t('state.activator');

        ACTIVATION_MODES.automatic.name = t('activation.automatic');
        ACTIVATION_MODES.interactive.name = t('activation.interactive');
        ACTIVATION_MODES.passive.name = t('activation.passive');
        ACTIVATION_MODES.onStart.name = t('activation.onStart');

        PULL_MODES.pull.name = t('pull.pull');
        PULL_MODES.push.name = t('pull.push');
        PULL_MODES.pushAll.name = t('pull.pushAll');
        PULL_MODES.any.name = t('pull.any');
    }

    refreshTypeLabels();

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
        this._intervalCounter = 0; // for interval notation (/N)

        // Chart node data
        if (this.type === 'chart') {
            this.chartData = {}; // { "NodeName": [values...] }
        }

        // Delay node queue
        if (this.type === 'delay') {
            this._delayQueue = []; // { step: N, amount: N }
        }

        // Queue node FIFO queue
        if (this.type === 'queue') {
            this._fifoQueue = [];
        }
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
        this.variables = {};
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
            node._intervalCounter = 0;
            if (node.type === 'chart') {
                node.chartData = {};
            }
            if (node.type === 'delay') {
                node._delayQueue = [];
            }
            if (node.type === 'queue') {
                node._fifoQueue = [];
            }
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
            connections: connsArr,
            variables: JSON.parse(JSON.stringify(this.variables))
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
        if (data.variables) {
            graph.variables = JSON.parse(JSON.stringify(data.variables));
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
    M.refreshTypeLabels = refreshTypeLabels;
    M.Node = Node;
    M.Connection = Connection;
    M.Graph = Graph;
    M.History = History;
    M.generateId = generateId;

})(window.Machinations);
