/**
 * properties.js - Properties Panel
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    function PropertiesPanel(container, app) {
        this.container = container;
        this.content = container.querySelector('#properties-content');
        this.app = app;
        this._currentElement = null;
        this._currentType = null; // 'node' or 'connection'
    }

    PropertiesPanel.prototype.clear = function() {
        this.content.innerHTML = '<p class="placeholder">' + M.t('props.placeholder') + '</p>';
        this._currentElement = null;
        this._currentType = null;
    };

    PropertiesPanel.prototype.showNode = function(node) {
        this._currentElement = node;
        this._currentType = 'node';
        var html = '';
        var t = M.t;

        // Type badge
        var typeDef = node.getTypeDef();
        html += '<div class="prop-type prop-type-' + node.type + '">' + typeDef.name + '</div>';

        // ID
        html += '<div class="prop-group"><label>' + t('props.id') + '</label><input type="text" value="' + node.id + '" readonly style="opacity:0.5"></div>';

        // Name
        html += '<div class="prop-group"><label>' + t('props.name') + '</label><input type="text" data-prop="name" value="' + this._esc(node.properties.name || '') + '"></div>';

        // Type-specific properties
        switch (node.type) {
            case 'pool':
                html += this._numberField(t('props.startValue'), 'startValue', node.properties.startValue || 0);
                html += this._numberField(t('props.capacity'), 'capacity', node.properties.capacity);
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                html += this._selectField(t('props.pullPush'), 'pullMode', node.properties.pullMode, M.PULL_MODES);
                break;

            case 'source':
                html += '<div class="prop-group"><label>' + t('props.production') + '</label><input type="text" data-prop="production" value="' + this._esc(String(node.properties.production || 1)) + '" placeholder="' + this._esc(t('props.production.placeholder')) + '"></div>';
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                html += '<div class="prop-group"><label>' + t('props.resourceColor') + '</label><select data-prop="resourceColor">';
                html += '<option value="default">' + t('props.color.default') + '</option>';
                html += '<option value="#ff9800"' + (node.properties.resourceColor === '#ff9800' ? ' selected' : '') + '>' + t('props.color.orange') + '</option>';
                html += '<option value="#2196f3"' + (node.properties.resourceColor === '#2196f3' ? ' selected' : '') + '>' + t('props.color.blue') + '</option>';
                html += '<option value="#4caf50"' + (node.properties.resourceColor === '#4caf50' ? ' selected' : '') + '>' + t('props.color.green') + '</option>';
                html += '<option value="#f44336"' + (node.properties.resourceColor === '#f44336' ? ' selected' : '') + '>' + t('props.color.red') + '</option>';
                html += '<option value="#9c27b0"' + (node.properties.resourceColor === '#9c27b0' ? ' selected' : '') + '>' + t('props.color.purple') + '</option>';
                html += '</select></div>';
                break;

            case 'drain':
                html += '<div class="prop-group"><label>' + t('props.consumption') + '</label><input type="text" data-prop="consumption" value="' + this._esc(String(node.properties.consumption || 1)) + '" placeholder="' + this._esc(t('props.consumption.placeholder')) + '"></div>';
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'converter':
                html += this._numberField(t('props.inputRate'), 'inputRate', node.properties.inputRate || 1);
                html += this._numberField(t('props.outputRate'), 'outputRate', node.properties.outputRate || 1);
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'gate':
                html += this._selectField(t('props.gateType'), 'gateType', node.properties.gateType, {
                    probabilistic: { name: t('props.gate.probabilistic') },
                    deterministic: { name: t('props.gate.deterministic') }
                });
                html += '<div class="prop-group"><label>' + t('props.distribution') + '</label><input type="text" data-prop="distribution" value="' + this._esc(node.properties.distribution || '') + '" placeholder="' + this._esc(t('props.distribution.placeholder')) + '"></div>';
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'trader':
                html += this._numberField(t('props.exchangeRate'), 'exchangeRate', node.properties.exchangeRate || 1);
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'register':
                html += this._numberField(t('props.value'), 'value', node.properties.value || 0);
                html += '<div class="prop-group"><label>' + t('props.formula') + '</label><textarea data-prop="formula" placeholder="' + this._esc(t('props.formula.placeholder')) + '">' + this._esc(node.properties.formula || '') + '</textarea></div>';
                break;

            case 'endCondition':
                html += '<div class="prop-group"><label>' + t('props.condition') + '</label><textarea data-prop="condition" placeholder="' + this._esc(t('props.condition.placeholder')) + '">' + this._esc(node.properties.condition || '') + '</textarea></div>';
                break;

            case 'chart':
                html += this._numberField(t('props.maxDataPoints'), 'maxDataPoints', node.properties.maxDataPoints || 100);
                // Show tracked series info
                if (node.chartData) {
                    var series = Object.keys(node.chartData);
                    if (series.length > 0) {
                        html += '<div class="prop-group"><label>' + t('props.recording') + '</label><input type="text" value="' + this._esc(series.join(', ')) + '" readonly style="opacity:0.7"></div>';
                    }
                }
                break;

            case 'delay':
                html += this._numberField(t('props.delaySteps'), 'delay', node.properties.delay || 3);
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'queue':
                html += this._numberField(t('props.capacity'), 'capacity', node.properties.capacity);
                html += this._selectField(t('props.activation'), 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'textLabel':
                html += '<div class="prop-group"><label>' + t('props.text') + '</label><textarea data-prop="text" placeholder="' + this._esc(t('props.text.placeholder')) + '">' + this._esc(node.properties.text || '') + '</textarea></div>';
                break;

            case 'group':
                break;
        }

        // Position
        html += '<div class="prop-group"><label>' + t('props.x') + '</label><input type="number" data-prop="x" value="' + Math.round(node.x) + '"></div>';
        html += '<div class="prop-group"><label>' + t('props.y') + '</label><input type="number" data-prop="y" value="' + Math.round(node.y) + '"></div>';

        this.content.innerHTML = html;
        this._bindInputEvents();
    };

    PropertiesPanel.prototype.showConnection = function(conn) {
        this._currentElement = conn;
        this._currentType = 'connection';
        var html = '';
        var t = M.t;

        var typeDef = conn.getTypeDef();
        html += '<div class="prop-type prop-type-' + conn.type + '">' + typeDef.name + '</div>';

        html += '<div class="prop-group"><label>' + t('props.id') + '</label><input type="text" value="' + conn.id + '" readonly style="opacity:0.5"></div>';

        if (conn.type === 'resourceConnection') {
            html += '<div class="prop-group"><label>' + t('props.rate') + '</label><input type="text" data-prop="rate" value="' + this._esc(String(conn.properties.rate || 1)) + '" placeholder="' + this._esc(t('props.rate.placeholder')) + '"></div>';
            html += '<div class="prop-group"><label>' + t('props.label') + '</label><input type="text" data-prop="label" value="' + this._esc(conn.properties.label || '') + '"></div>';
            html += '<div class="prop-group"><label>' + t('props.colorFilter') + '</label><select data-prop="colorFilter">';
            html += '<option value="">' + t('props.color.all') + '</option>';
            html += '<option value="#ff9800"' + (conn.properties.colorFilter === '#ff9800' ? ' selected' : '') + '>' + t('props.color.orange') + '</option>';
            html += '<option value="#2196f3"' + (conn.properties.colorFilter === '#2196f3' ? ' selected' : '') + '>' + t('props.color.blue') + '</option>';
            html += '<option value="#4caf50"' + (conn.properties.colorFilter === '#4caf50' ? ' selected' : '') + '>' + t('props.color.green') + '</option>';
            html += '<option value="#f44336"' + (conn.properties.colorFilter === '#f44336' ? ' selected' : '') + '>' + t('props.color.red') + '</option>';
            html += '<option value="#9c27b0"' + (conn.properties.colorFilter === '#9c27b0' ? ' selected' : '') + '>' + t('props.color.purple') + '</option>';
            html += '</select></div>';
        } else if (conn.type === 'stateConnection') {
            html += this._selectField(t('props.subtype'), 'stateType', conn.properties.stateType || 'labelModifier', M.STATE_CONNECTION_TYPES);
            html += '<div class="prop-group"><label>' + t('props.formula') + '</label><textarea data-prop="formula" placeholder="' + this._esc(t('props.formula.conn.placeholder')) + '">' + this._esc(conn.properties.formula || '') + '</textarea></div>';
            html += '<div class="prop-group"><label>' + t('props.condition') + '</label><input type="text" data-prop="condition" value="' + this._esc(conn.properties.condition || '') + '" placeholder="' + this._esc(t('props.condition.conn.placeholder')) + '"></div>';
            html += '<div class="prop-group"><label>' + t('props.label') + '</label><input type="text" data-prop="label" value="' + this._esc(conn.properties.label || '') + '"></div>';
        }

        // Source/Target info
        var sourceNode = this.app.graph.getNode(conn.sourceId);
        var targetNode = this.app.graph.getNode(conn.targetId);
        html += '<div class="prop-group"><label>' + t('props.source') + '</label><input type="text" value="' + (sourceNode ? sourceNode.properties.name : conn.sourceId) + '" readonly style="opacity:0.5"></div>';
        html += '<div class="prop-group"><label>' + t('props.target') + '</label><input type="text" value="' + (targetNode ? targetNode.properties.name : conn.targetId) + '" readonly style="opacity:0.5"></div>';

        this.content.innerHTML = html;
        this._bindInputEvents();
    };

    PropertiesPanel.prototype._numberField = function(label, prop, value) {
        return '<div class="prop-group"><label>' + label + '</label><input type="number" data-prop="' + prop + '" value="' + (value !== undefined ? value : 0) + '" step="1"></div>';
    };

    PropertiesPanel.prototype._selectField = function(label, prop, currentValue, options) {
        var html = '<div class="prop-group"><label>' + label + '</label><select data-prop="' + prop + '">';
        for (var key in options) {
            var selected = key === currentValue ? ' selected' : '';
            html += '<option value="' + key + '"' + selected + '>' + options[key].name + '</option>';
        }
        html += '</select></div>';
        return html;
    };

    PropertiesPanel.prototype._esc = function(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    PropertiesPanel.prototype._bindInputEvents = function() {
        var self = this;
        var inputs = this.content.querySelectorAll('input[data-prop], select[data-prop], textarea[data-prop]');

        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('change', function(e) {
                self._onPropertyChange(e.target);
            });
            inputs[i].addEventListener('input', function(e) {
                if (e.target.tagName === 'INPUT' && e.target.type !== 'number') {
                    self._onPropertyChange(e.target);
                }
            });
        }
    };

    PropertiesPanel.prototype._onPropertyChange = function(input) {
        if (!this._currentElement) return;

        var prop = input.getAttribute('data-prop');
        var value = input.value;

        // Handle special positional properties
        if (prop === 'x' || prop === 'y') {
            this._currentElement[prop] = parseFloat(value) || 0;
            if (this.app.renderer) {
                this.app.renderer.updateNode(this._currentElement);
                // Update connected connections
                var conns = this.app.graph.getAllConnections();
                for (var i = 0; i < conns.length; i++) {
                    if (conns[i].sourceId === this._currentElement.id || conns[i].targetId === this._currentElement.id) {
                        this.app.renderer.updateConnection(conns[i]);
                    }
                }
            }
            return;
        }

        // Convert number values (but not for rate/production/consumption which accept dice notation)
        var textRateProps = ['rate', 'production', 'consumption'];
        if (input.type === 'number') {
            value = parseFloat(value);
            if (isNaN(value)) value = 0;
        } else if (textRateProps.indexOf(prop) !== -1) {
            // Keep as string if it contains non-numeric characters (dice, interval, etc.)
            var numVal = parseFloat(value);
            if (!isNaN(numVal) && String(numVal) === value.trim()) {
                value = numVal;
            }
            // Otherwise keep as string (e.g., "D6", "&3", "/2")
        }

        this._currentElement.properties[prop] = value;

        // Special handling for startValue -> resources
        if (prop === 'startValue' && this._currentType === 'node') {
            this._currentElement.resources = value;
        }

        // Special handling for register value
        if (prop === 'value' && this._currentElement.type === 'register') {
            this._currentElement.resources = value;
        }

        // Re-render
        if (this.app.renderer) {
            if (this._currentType === 'node') {
                this.app.renderer.updateNode(this._currentElement);
            } else {
                // Need to re-render connection for visual updates
                this.app.renderer.removeConnectionElement(this._currentElement.id);
                this.app.renderer.renderConnection(this._currentElement);
            }
        }

        this.app.saveHistory();
    };

    PropertiesPanel.prototype.refresh = function() {
        if (this._currentElement && this._currentType === 'node') {
            this.showNode(this._currentElement);
        } else if (this._currentElement && this._currentType === 'connection') {
            this.showConnection(this._currentElement);
        }
    };

    M.PropertiesPanel = PropertiesPanel;

})(window.Machinations);
