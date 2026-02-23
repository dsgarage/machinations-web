/**
 * engine.js - Simulation Engine
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    function Engine(graph) {
        this.graph = graph;
        this.running = false;
        this.intervalId = null;
        this.speed = 5; // steps per second factor
        this.onStep = null; // callback after each step
        this.onEnd = null;  // callback when simulation ends
        this.resourceFlows = []; // track flows for animation
    }

    Engine.prototype.start = function() {
        if (this.running) return;
        this.running = true;

        // Fire onStart nodes on first step
        if (this.graph.stepCount === 0) {
            this._fireOnStartNodes();
        }

        var self = this;
        var interval = Math.max(50, 1000 / this.speed);
        this.intervalId = setInterval(function() {
            self.step();
        }, interval);
    };

    Engine.prototype.stop = function() {
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    };

    Engine.prototype.setSpeed = function(speed) {
        this.speed = speed;
        if (this.running) {
            this.stop();
            this.start();
        }
    };

    Engine.prototype.reset = function() {
        this.stop();
        this.graph.reset();
    };

    Engine.prototype._fireOnStartNodes = function() {
        var nodes = this.graph.getAllNodes();
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].properties.activationMode === 'onStart') {
                nodes[i].activated = true;
            }
        }
    };

    Engine.prototype.step = function() {
        var graph = this.graph;
        this.resourceFlows = [];

        // 1. Determine which nodes to activate
        this._activateNodes();

        // 2. Evaluate state connections (register updates, label modifiers)
        this._evaluateStateConnections();

        // 3. Process resource flows
        this._processResourceFlows();

        // 4. Process converters
        this._processConverters();

        // 5. Process gates
        this._processGates();

        // 6. Process sources
        this._processSources();

        // 7. Process drains
        this._processDrains();

        // 8. Update chart nodes
        this._updateCharts();

        // 9. Evaluate end conditions
        var ended = this._evaluateEndConditions();

        // 10. Evaluate triggers
        this._evaluateTriggers();

        // 11. Update step counter
        graph.stepCount++;

        // Reset activation flags
        var nodes = graph.getAllNodes();
        for (var i = 0; i < nodes.length; i++) {
            nodes[i].fired = false;
            if (nodes[i].properties.activationMode === 'onStart') {
                nodes[i].activated = false;
            }
        }

        if (this.onStep) {
            this.onStep(graph.stepCount, this.resourceFlows);
        }

        if (ended) {
            this.stop();
            if (this.onEnd) {
                this.onEnd(graph.stepCount);
            }
        }
    };

    Engine.prototype._activateNodes = function() {
        var nodes = this.graph.getAllNodes();
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var mode = node.properties.activationMode;
            if (mode === 'automatic') {
                node.activated = true;
            }
            // interactive and passive are handled externally
        }
    };

    Engine.prototype.activateInteractiveNode = function(nodeId) {
        var node = this.graph.getNode(nodeId);
        if (node && node.properties.activationMode === 'interactive') {
            node.activated = true;
        }
    };

    Engine.prototype._evaluateStateConnections = function() {
        var graph = this.graph;
        var connections = graph.getAllConnections();

        // First pass: update registers
        var nodes = graph.getAllNodes();
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type === 'register' && node.properties.formula) {
                node.properties.value = this._evaluateFormula(node.properties.formula, node);
                node.resources = node.properties.value;
            }
        }

        // Second pass: apply state connections
        for (var j = 0; j < connections.length; j++) {
            var conn = connections[j];
            if (conn.type !== 'stateConnection' || !conn.active) continue;

            var source = graph.getNode(conn.sourceId);
            var target = graph.getNode(conn.targetId);
            if (!source || !target) continue;

            var stateType = conn.properties.stateType || 'labelModifier';
            var formula = conn.properties.formula || '';

            switch (stateType) {
                case 'labelModifier':
                    this._applyLabelModifier(conn, source, target, formula);
                    break;
                case 'nodeModifier':
                    this._applyNodeModifier(conn, source, target, formula);
                    break;
                case 'activator':
                    this._applyActivator(conn, source, target, formula);
                    break;
                // triggers are handled later
            }
        }
    };

    Engine.prototype._applyLabelModifier = function(conn, source, target, formula) {
        // Modify the rate of outgoing resource connections from target
        var sourceValue = this._getNodeValue(source);
        var newRate = formula ? this._evaluateFormula(formula, source) : sourceValue;

        // Find resource connections from target or any connection the state conn targets
        // If target is a connection (we store target as node), modify that connection's rate
        var outConns = this.graph.getOutgoingConnections(target.id, 'resourceConnection');
        for (var i = 0; i < outConns.length; i++) {
            outConns[i].currentRate = Math.max(0, Math.round(newRate * 100) / 100);
        }
    };

    Engine.prototype._applyNodeModifier = function(conn, source, target, formula) {
        var sourceValue = this._getNodeValue(source);
        var newValue = formula ? this._evaluateFormula(formula, source) : sourceValue;

        // Modify production/consumption rate of target node
        if (target.type === 'source') {
            target.properties.production = Math.max(0, Math.round(newValue));
        } else if (target.type === 'drain') {
            target.properties.consumption = Math.max(0, Math.round(newValue));
        }
    };

    Engine.prototype._applyActivator = function(conn, source, target, formula) {
        var sourceValue = this._getNodeValue(source);
        var condition = formula || '>0';
        var active = this._evaluateCondition(condition, sourceValue);
        target.activated = active;
    };

    Engine.prototype._evaluateTriggers = function() {
        var connections = this.graph.getAllConnections();
        for (var i = 0; i < connections.length; i++) {
            var conn = connections[i];
            if (conn.type !== 'stateConnection') continue;
            if (conn.properties.stateType !== 'trigger') continue;

            var source = this.graph.getNode(conn.sourceId);
            var target = this.graph.getNode(conn.targetId);
            if (!source || !target) continue;

            var condition = conn.properties.condition || '>0';
            var sourceValue = this._getNodeValue(source);

            if (this._evaluateCondition(condition, sourceValue)) {
                target.activated = true;
            }
        }
    };

    Engine.prototype._getNodeValue = function(node) {
        if (node.type === 'register') {
            return node.properties.value || 0;
        }
        return node.resources || 0;
    };

    // ===== Dice Notation Parser =====
    // Supports: D6, 2D6, D6+3, 2D6+3, D20, 3D6-1, D6*2
    Engine.prototype._parseDice = function(expr) {
        var dicePattern = /(\d*)D(\d+)/gi;
        return expr.replace(dicePattern, function(match, count, sides) {
            count = parseInt(count) || 1;
            sides = parseInt(sides);
            var total = 0;
            for (var i = 0; i < count; i++) {
                total += Math.floor(Math.random() * sides) + 1;
            }
            return String(total);
        });
    };

    // ===== Rate Parser =====
    // Parses rate strings with special notation: &N (all-or-nothing), /N (interval), D6 (dice)
    Engine.prototype._parseRate = function(rateStr, node) {
        if (typeof rateStr === 'number') return { value: rateStr, allOrNothing: false, interval: 0 };
        var str = String(rateStr).trim();
        if (!str) return { value: 1, allOrNothing: false, interval: 0 };

        var allOrNothing = false;
        var interval = 0;

        // All-or-Nothing: &N
        if (str.charAt(0) === '&') {
            allOrNothing = true;
            str = str.substring(1).trim();
        }

        // Interval: /N (fire every N steps)
        var intervalMatch = str.match(/^\/(\d+)$/);
        if (intervalMatch) {
            interval = parseInt(intervalMatch[1]);
            return { value: 1, allOrNothing: allOrNothing, interval: interval };
        }

        // Dice notation and formulas
        str = this._parseDice(str);

        // Node references
        var graph = this.graph;
        str = str.replace(/\{([^}]+)\}/g, function(match, nodeName) {
            var nodes = graph.getAllNodes();
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].properties.name === nodeName) {
                    return nodes[i].resources || 0;
                }
            }
            return 0;
        });

        if (node) {
            str = str.replace(/\bself\b/g, String(node.resources || 0));
        }

        try {
            var value = Function('"use strict"; return (' + str + ')')();
            value = isNaN(value) ? 1 : value;
            return { value: value, allOrNothing: allOrNothing, interval: interval };
        } catch (e) {
            return { value: 1, allOrNothing: allOrNothing, interval: interval };
        }
    };

    // ===== Interval Check =====
    Engine.prototype._checkInterval = function(node, interval) {
        if (interval <= 0) return true;
        node._intervalCounter = (node._intervalCounter || 0) + 1;
        if (node._intervalCounter >= interval) {
            node._intervalCounter = 0;
            return true;
        }
        return false;
    };

    Engine.prototype._evaluateFormula = function(formula, contextNode) {
        try {
            // Replace dice notation first
            var expr = this._parseDice(formula);

            // Replace node references with values
            var graph = this.graph;
            expr = expr.replace(/\{([^}]+)\}/g, function(match, nodeName) {
                var nodes = graph.getAllNodes();
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].properties.name === nodeName) {
                        return nodes[i].resources || 0;
                    }
                }
                return 0;
            });

            // Replace 'self' with context node value
            if (contextNode) {
                expr = expr.replace(/\bself\b/g, String(contextNode.resources || 0));
            }

            // Safe eval with limited scope
            var result = Function('"use strict"; return (' + expr + ')')();
            return isNaN(result) ? 0 : result;
        } catch (e) {
            return 0;
        }
    };

    Engine.prototype._evaluateCondition = function(condition, value) {
        try {
            var expr = condition.replace(/\bvalue\b/g, String(value));
            // If condition is just a comparison operator + number
            if (/^[><=!]+\s*[\d.]+$/.test(condition.trim())) {
                expr = String(value) + condition;
            }
            return !!Function('"use strict"; return (' + expr + ')')();
        } catch (e) {
            return value > 0;
        }
    };

    Engine.prototype._processResourceFlows = function() {
        var graph = this.graph;
        var connections = graph.getAllConnections();

        for (var i = 0; i < connections.length; i++) {
            var conn = connections[i];
            if (conn.type !== 'resourceConnection' || !conn.active) continue;

            var source = graph.getNode(conn.sourceId);
            var target = graph.getNode(conn.targetId);
            if (!source || !target) continue;

            // Skip sources and drains (handled separately)
            if (source.type === 'source' || target.type === 'drain') continue;
            // Skip converters and gates (handled separately)
            if (source.type === 'converter' || source.type === 'gate') continue;
            if (target.type === 'converter' || target.type === 'gate') continue;

            // Check activation based on pull/push mode
            var pullMode = target.properties.pullMode || source.properties.pullMode || 'pull';
            var rateParsed = this._parseRate(
                conn.currentRate !== undefined ? conn.currentRate : (conn.properties.rate || 1),
                source
            );

            if (pullMode === 'pull' && target.activated) {
                this._transferResources(source, target, conn, rateParsed);
            } else if (pullMode === 'push' && source.activated) {
                this._transferResources(source, target, conn, rateParsed);
            } else if (source.activated || target.activated) {
                this._transferResources(source, target, conn, rateParsed);
            }
        }
    };

    Engine.prototype._transferResources = function(source, target, conn, rateParsed) {
        var rate = typeof rateParsed === 'object' ? rateParsed.value : rateParsed;
        var allOrNothing = typeof rateParsed === 'object' ? rateParsed.allOrNothing : false;

        if (rate <= 0) return;

        // All-or-Nothing: if source doesn't have enough, transfer nothing
        if (allOrNothing && source.type !== 'source' && source.resources < rate) return;

        if (!target.canAcceptResource(rate)) {
            if (allOrNothing) return; // Can't fit all, transfer nothing
            rate = Math.max(0, (target.properties.capacity || 0) - target.resources);
            if (rate <= 0) return;
        }

        var removed = source.removeResources(rate);
        if (removed > 0) {
            target.addResources(removed);
            this.resourceFlows.push({
                connectionId: conn.id,
                amount: removed,
                sourceId: source.id,
                targetId: target.id
            });
        }
    };

    Engine.prototype._processSources = function() {
        var graph = this.graph;
        var nodes = graph.getAllNodes();

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type !== 'source' || !node.activated) continue;

            var outConns = graph.getOutgoingConnections(node.id, 'resourceConnection');
            var prodParsed = this._parseRate(node.properties.production || 1, node);
            var production = prodParsed.value;

            // Check interval
            if (prodParsed.interval > 0 && !this._checkInterval(node, prodParsed.interval)) continue;

            for (var j = 0; j < outConns.length; j++) {
                var conn = outConns[j];
                if (!conn.active) continue;
                var target = graph.getNode(conn.targetId);
                if (!target) continue;

                var rateParsed = this._parseRate(
                    conn.currentRate !== undefined ? conn.currentRate : (conn.properties.rate || 1),
                    node
                );
                var amount = Math.min(production, rateParsed.value);

                if (target.canAcceptResource(amount)) {
                    target.addResources(amount);
                    this.resourceFlows.push({
                        connectionId: conn.id,
                        amount: amount,
                        sourceId: node.id,
                        targetId: target.id
                    });
                }
            }
        }
    };

    Engine.prototype._processDrains = function() {
        var graph = this.graph;
        var nodes = graph.getAllNodes();

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type !== 'drain' || !node.activated) continue;

            var consParsed = this._parseRate(node.properties.consumption || 1, node);
            var consumption = consParsed.value;

            // Check interval
            if (consParsed.interval > 0 && !this._checkInterval(node, consParsed.interval)) continue;

            var inConns = graph.getIncomingConnections(node.id, 'resourceConnection');

            for (var j = 0; j < inConns.length; j++) {
                var conn = inConns[j];
                if (!conn.active) continue;
                var source = graph.getNode(conn.sourceId);
                if (!source) continue;

                var rateParsed = this._parseRate(
                    conn.currentRate !== undefined ? conn.currentRate : (conn.properties.rate || 1),
                    node
                );
                var amount = Math.min(consumption, rateParsed.value);

                // All-or-Nothing check
                if (rateParsed.allOrNothing && source.resources < amount) continue;

                var removed = source.removeResources(amount);
                if (removed > 0) {
                    this.resourceFlows.push({
                        connectionId: conn.id,
                        amount: removed,
                        sourceId: source.id,
                        targetId: node.id
                    });
                }
            }
        }
    };

    Engine.prototype._processConverters = function() {
        var graph = this.graph;
        var nodes = graph.getAllNodes();

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type !== 'converter') continue;

            var inConns = graph.getIncomingConnections(node.id, 'resourceConnection');
            var outConns = graph.getOutgoingConnections(node.id, 'resourceConnection');
            if (inConns.length === 0 || outConns.length === 0) continue;

            var inputRate = node.properties.inputRate || 1;
            var outputRate = node.properties.outputRate || 1;

            // Check if enough input is available
            var totalInput = 0;
            for (var j = 0; j < inConns.length; j++) {
                var conn = inConns[j];
                var source = graph.getNode(conn.sourceId);
                if (source && source.type !== 'source') {
                    totalInput += Math.min(source.resources, inputRate);
                } else if (source && source.type === 'source') {
                    totalInput += inputRate;
                }
            }

            if (totalInput >= inputRate) {
                // Consume input
                var remaining = inputRate;
                for (var j = 0; j < inConns.length && remaining > 0; j++) {
                    var conn = inConns[j];
                    var source = graph.getNode(conn.sourceId);
                    if (!source) continue;
                    var removed = source.removeResources(remaining);
                    remaining -= removed;

                    if (removed > 0) {
                        this.resourceFlows.push({
                            connectionId: conn.id,
                            amount: removed,
                            sourceId: source.id,
                            targetId: node.id
                        });
                    }
                }

                // Produce output
                for (var k = 0; k < outConns.length; k++) {
                    var outConn = outConns[k];
                    var target = graph.getNode(outConn.targetId);
                    if (!target) continue;
                    if (target.canAcceptResource(outputRate)) {
                        target.addResources(outputRate);
                        this.resourceFlows.push({
                            connectionId: outConn.id,
                            amount: outputRate,
                            sourceId: node.id,
                            targetId: target.id
                        });
                    }
                }
            }
        }
    };

    Engine.prototype._processGates = function() {
        var graph = this.graph;
        var nodes = graph.getAllNodes();

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type !== 'gate') continue;

            var inConns = graph.getIncomingConnections(node.id, 'resourceConnection');
            var outConns = graph.getOutgoingConnections(node.id, 'resourceConnection');
            if (inConns.length === 0 || outConns.length === 0) continue;

            // Collect incoming resources
            var totalInput = 0;
            for (var j = 0; j < inConns.length; j++) {
                var conn = inConns[j];
                var source = graph.getNode(conn.sourceId);
                if (!source) continue;
                var rate = conn.currentRate !== undefined ? conn.currentRate : (conn.properties.rate || 1);
                var removed = source.removeResources(rate);
                totalInput += removed;
                if (removed > 0) {
                    this.resourceFlows.push({
                        connectionId: conn.id,
                        amount: removed,
                        sourceId: source.id,
                        targetId: node.id
                    });
                }
            }

            if (totalInput <= 0) continue;

            var gateType = node.properties.gateType || 'probabilistic';

            if (gateType === 'probabilistic') {
                // Random distribution
                var rand = Math.random();
                var cumulative = 0;
                var perOutput = 1 / outConns.length;

                for (var k = 0; k < outConns.length; k++) {
                    cumulative += perOutput;
                    if (rand <= cumulative || k === outConns.length - 1) {
                        var outConn = outConns[k];
                        var target = graph.getNode(outConn.targetId);
                        if (target && target.canAcceptResource(totalInput)) {
                            target.addResources(totalInput);
                            this.resourceFlows.push({
                                connectionId: outConn.id,
                                amount: totalInput,
                                sourceId: node.id,
                                targetId: target.id
                            });
                        }
                        break;
                    }
                }
            } else {
                // Deterministic: distribute evenly
                var perOutput = Math.floor(totalInput / outConns.length);
                var remainder = totalInput - perOutput * outConns.length;

                for (var k = 0; k < outConns.length; k++) {
                    var amount = perOutput + (k === 0 ? remainder : 0);
                    if (amount <= 0) continue;
                    var outConn = outConns[k];
                    var target = graph.getNode(outConn.targetId);
                    if (target && target.canAcceptResource(amount)) {
                        target.addResources(amount);
                        this.resourceFlows.push({
                            connectionId: outConn.id,
                            amount: amount,
                            sourceId: node.id,
                            targetId: target.id
                        });
                    }
                }
            }
        }
    };

    Engine.prototype._updateCharts = function() {
        var graph = this.graph;
        var nodes = graph.getAllNodes();

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type !== 'chart') continue;

            // Collect values from all incoming state connections
            var inConns = graph.getIncomingConnections(node.id, 'stateConnection');
            for (var j = 0; j < inConns.length; j++) {
                var conn = inConns[j];
                var source = graph.getNode(conn.sourceId);
                if (!source) continue;

                var name = source.properties.name || source.id;
                if (!node.chartData[name]) {
                    node.chartData[name] = [];
                }
                var value = this._getNodeValue(source);
                node.chartData[name].push(value);

                // Limit data points
                var max = node.properties.maxDataPoints || 100;
                if (node.chartData[name].length > max) {
                    node.chartData[name].shift();
                }
            }
        }
    };

    Engine.prototype._evaluateEndConditions = function() {
        var nodes = this.graph.getAllNodes();
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.type !== 'endCondition') continue;

            var condition = node.properties.condition;
            if (!condition) continue;

            try {
                var result = this._evaluateFormula(condition, node);
                if (result) return true;
            } catch (e) {
                // ignore
            }
        }
        return false;
    };

    M.Engine = Engine;

})(window.Machinations);
