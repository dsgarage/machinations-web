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
        this.content.innerHTML = '<p class="placeholder">要素を選択してください</p>';
        this._currentElement = null;
        this._currentType = null;
    };

    PropertiesPanel.prototype.showNode = function(node) {
        this._currentElement = node;
        this._currentType = 'node';
        var html = '';

        // Type badge
        var typeDef = node.getTypeDef();
        html += '<div class="prop-type prop-type-' + node.type + '">' + typeDef.name + '</div>';

        // ID
        html += '<div class="prop-group"><label>ID</label><input type="text" value="' + node.id + '" readonly style="opacity:0.5"></div>';

        // Name
        html += '<div class="prop-group"><label>名前</label><input type="text" data-prop="name" value="' + this._esc(node.properties.name || '') + '"></div>';

        // Type-specific properties
        switch (node.type) {
            case 'pool':
                html += this._numberField('初期値', 'startValue', node.properties.startValue || 0);
                html += this._numberField('容量 (-1=無限)', 'capacity', node.properties.capacity);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                html += this._selectField('プル/プッシュ', 'pullMode', node.properties.pullMode, M.PULL_MODES);
                break;

            case 'source':
                html += this._numberField('生産量', 'production', node.properties.production || 1);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'drain':
                html += this._numberField('消費量', 'consumption', node.properties.consumption || 1);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'converter':
                html += this._numberField('入力レート', 'inputRate', node.properties.inputRate || 1);
                html += this._numberField('出力レート', 'outputRate', node.properties.outputRate || 1);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'gate':
                html += this._selectField('ゲートタイプ', 'gateType', node.properties.gateType, {
                    probabilistic: { name: '確率的' },
                    deterministic: { name: '決定的' }
                });
                html += '<div class="prop-group"><label>分配</label><input type="text" data-prop="distribution" value="' + this._esc(node.properties.distribution || '') + '" placeholder="例: 50,50"></div>';
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'trader':
                html += this._numberField('交換レート', 'exchangeRate', node.properties.exchangeRate || 1);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'register':
                html += this._numberField('値', 'value', node.properties.value || 0);
                html += '<div class="prop-group"><label>計算式</label><textarea data-prop="formula" placeholder="例: {プール1} * 2">' + this._esc(node.properties.formula || '') + '</textarea></div>';
                break;

            case 'endCondition':
                html += '<div class="prop-group"><label>条件</label><textarea data-prop="condition" placeholder="例: {プール1} >= 100">' + this._esc(node.properties.condition || '') + '</textarea></div>';
                break;
        }

        // Position
        html += '<div class="prop-group"><label>X座標</label><input type="number" data-prop="x" value="' + Math.round(node.x) + '"></div>';
        html += '<div class="prop-group"><label>Y座標</label><input type="number" data-prop="y" value="' + Math.round(node.y) + '"></div>';

        this.content.innerHTML = html;
        this._bindInputEvents();
    };

    PropertiesPanel.prototype.showConnection = function(conn) {
        this._currentElement = conn;
        this._currentType = 'connection';
        var html = '';

        var typeDef = conn.getTypeDef();
        html += '<div class="prop-type prop-type-' + conn.type + '">' + typeDef.name + '</div>';

        html += '<div class="prop-group"><label>ID</label><input type="text" value="' + conn.id + '" readonly style="opacity:0.5"></div>';

        if (conn.type === 'resourceConnection') {
            html += this._numberField('レート', 'rate', conn.properties.rate || 1);
            html += '<div class="prop-group"><label>ラベル</label><input type="text" data-prop="label" value="' + this._esc(conn.properties.label || '') + '"></div>';
        } else if (conn.type === 'stateConnection') {
            html += this._selectField('サブタイプ', 'stateType', conn.properties.stateType || 'labelModifier', M.STATE_CONNECTION_TYPES);
            html += '<div class="prop-group"><label>計算式</label><textarea data-prop="formula" placeholder="例: self * 0.5">' + this._esc(conn.properties.formula || '') + '</textarea></div>';
            html += '<div class="prop-group"><label>条件</label><input type="text" data-prop="condition" value="' + this._esc(conn.properties.condition || '') + '" placeholder="例: >10"></div>';
            html += '<div class="prop-group"><label>ラベル</label><input type="text" data-prop="label" value="' + this._esc(conn.properties.label || '') + '"></div>';
        }

        // Source/Target info
        var sourceNode = this.app.graph.getNode(conn.sourceId);
        var targetNode = this.app.graph.getNode(conn.targetId);
        html += '<div class="prop-group"><label>ソース</label><input type="text" value="' + (sourceNode ? sourceNode.properties.name : conn.sourceId) + '" readonly style="opacity:0.5"></div>';
        html += '<div class="prop-group"><label>ターゲット</label><input type="text" value="' + (targetNode ? targetNode.properties.name : conn.targetId) + '" readonly style="opacity:0.5"></div>';

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

        // Convert number values
        if (input.type === 'number') {
            value = parseFloat(value);
            if (isNaN(value)) value = 0;
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
