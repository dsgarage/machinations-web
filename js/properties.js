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
                html += '<div class="prop-group"><label>生産量</label><input type="text" data-prop="production" value="' + this._esc(String(node.properties.production || 1)) + '" placeholder="例: 1, D6, /3"></div>';
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                html += '<div class="prop-group"><label>リソース色</label><select data-prop="resourceColor">';
                html += '<option value="default">デフォルト</option>';
                html += '<option value="#ff9800"' + (node.properties.resourceColor === '#ff9800' ? ' selected' : '') + '>オレンジ</option>';
                html += '<option value="#2196f3"' + (node.properties.resourceColor === '#2196f3' ? ' selected' : '') + '>ブルー</option>';
                html += '<option value="#4caf50"' + (node.properties.resourceColor === '#4caf50' ? ' selected' : '') + '>グリーン</option>';
                html += '<option value="#f44336"' + (node.properties.resourceColor === '#f44336' ? ' selected' : '') + '>レッド</option>';
                html += '<option value="#9c27b0"' + (node.properties.resourceColor === '#9c27b0' ? ' selected' : '') + '>パープル</option>';
                html += '</select></div>';
                break;

            case 'drain':
                html += '<div class="prop-group"><label>消費量</label><input type="text" data-prop="consumption" value="' + this._esc(String(node.properties.consumption || 1)) + '" placeholder="例: 1, D6, &2"></div>';
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

            case 'chart':
                html += this._numberField('最大データ点', 'maxDataPoints', node.properties.maxDataPoints || 100);
                // Show tracked series info
                if (node.chartData) {
                    var series = Object.keys(node.chartData);
                    if (series.length > 0) {
                        html += '<div class="prop-group"><label>記録中</label><input type="text" value="' + this._esc(series.join(', ')) + '" readonly style="opacity:0.7"></div>';
                    }
                }
                break;

            case 'delay':
                html += this._numberField('遅延ステップ', 'delay', node.properties.delay || 3);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'queue':
                html += this._numberField('容量 (-1=無限)', 'capacity', node.properties.capacity);
                html += this._selectField('アクティベーション', 'activationMode', node.properties.activationMode, M.ACTIVATION_MODES);
                break;

            case 'textLabel':
                html += '<div class="prop-group"><label>テキスト</label><textarea data-prop="text" placeholder="テキストを入力...">' + this._esc(node.properties.text || '') + '</textarea></div>';
                break;

            case 'group':
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
            html += '<div class="prop-group"><label>レート</label><input type="text" data-prop="rate" value="' + this._esc(String(conn.properties.rate || 1)) + '" placeholder="例: 1, D6, &3, /2"></div>';
            html += '<div class="prop-group"><label>ラベル</label><input type="text" data-prop="label" value="' + this._esc(conn.properties.label || '') + '"></div>';
            html += '<div class="prop-group"><label>色フィルター</label><select data-prop="colorFilter">';
            html += '<option value="">全色</option>';
            html += '<option value="#ff9800"' + (conn.properties.colorFilter === '#ff9800' ? ' selected' : '') + '>オレンジ</option>';
            html += '<option value="#2196f3"' + (conn.properties.colorFilter === '#2196f3' ? ' selected' : '') + '>ブルー</option>';
            html += '<option value="#4caf50"' + (conn.properties.colorFilter === '#4caf50' ? ' selected' : '') + '>グリーン</option>';
            html += '<option value="#f44336"' + (conn.properties.colorFilter === '#f44336' ? ' selected' : '') + '>レッド</option>';
            html += '<option value="#9c27b0"' + (conn.properties.colorFilter === '#9c27b0' ? ' selected' : '') + '>パープル</option>';
            html += '</select></div>';
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
