/**
 * toolbar.js - Toolbar
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    function Toolbar(container, app) {
        this.container = container;
        this.app = app;
        this.currentTool = 'select';
        this._buttons = {};
        this._init();
    }

    Toolbar.prototype._init = function() {
        var self = this;
        var buttons = this.container.querySelectorAll('.tool-btn');

        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var tool = btn.getAttribute('data-tool');
            this._buttons[tool] = btn;

            btn.addEventListener('click', (function(t) {
                return function() {
                    self.setTool(t);
                };
            })(tool));
        }
    };

    Toolbar.prototype.setTool = function(tool) {
        // Deactivate previous
        for (var key in this._buttons) {
            this._buttons[key].classList.remove('active');
        }

        this.currentTool = tool;

        if (this._buttons[tool]) {
            this._buttons[tool].classList.add('active');
        }

        // Update canvas cursor
        var canvas = document.getElementById('canvas');
        canvas.className = '';

        if (tool === 'select') {
            canvas.className = '';
        } else if (tool === 'delete') {
            canvas.className = 'tool-delete';
        } else if (tool === 'resourceConnection' || tool === 'stateConnection') {
            canvas.className = 'tool-connecting';
        } else {
            canvas.className = 'tool-placing';
        }

        // Update status
        this.app.setStatus(this._getToolDescription(tool));
    };

    Toolbar.prototype._getToolDescription = function(tool) {
        var descriptions = {
            select: '選択ツール - ノードをクリック/ドラッグ',
            pool: 'プール配置 - キャンバスをクリック',
            source: 'ソース配置 - キャンバスをクリック',
            drain: 'ドレイン配置 - キャンバスをクリック',
            converter: 'コンバーター配置 - キャンバスをクリック',
            gate: 'ゲート配置 - キャンバスをクリック',
            trader: 'トレーダー配置 - キャンバスをクリック',
            register: 'レジスター配置 - キャンバスをクリック',
            endCondition: 'エンドコンディション配置 - キャンバスをクリック',
            resourceConnection: 'リソース接続 - ソースをクリック→ターゲットをクリック',
            stateConnection: '状態接続 - ソースをクリック→ターゲットをクリック',
            'delete': '削除 - 要素をクリック'
        };
        return descriptions[tool] || '';
    };

    Toolbar.prototype.isNodeTool = function() {
        return M.NODE_TYPES.hasOwnProperty(this.currentTool);
    };

    Toolbar.prototype.isConnectionTool = function() {
        return this.currentTool === 'resourceConnection' || this.currentTool === 'stateConnection';
    };

    Toolbar.prototype.isSelectTool = function() {
        return this.currentTool === 'select';
    };

    Toolbar.prototype.isDeleteTool = function() {
        return this.currentTool === 'delete';
    };

    M.Toolbar = Toolbar;

})(window.Machinations);
