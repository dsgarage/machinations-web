/**
 * io.js - Save/Load
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    var STORAGE_KEY = 'machinations_autosave';

    function IO(app) {
        this.app = app;
    }

    IO.prototype.save = function() {
        var data = this.app.graph.toJSON();
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);

        var a = document.createElement('a');
        a.href = url;
        a.download = (data.name || 'machinations-diagram') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.app.setStatus('ダイアグラムを保存しました');
    };

    IO.prototype.load = function() {
        var input = document.getElementById('file-input');
        input.click();
    };

    IO.prototype.handleFileLoad = function(file) {
        var self = this;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                self._loadFromData(data);
                self.app.setStatus('ダイアグラムを読み込みました');
            } catch (err) {
                self.app.setStatus('エラー: ファイルの読み込みに失敗しました');
                console.error('Load error:', err);
            }
        };
        reader.readAsText(file);
    };

    IO.prototype._loadFromData = function(data) {
        var graph = M.Graph.fromJSON(data);
        this.app.graph = graph;
        this.app.engine.graph = graph;
        this.app.renderer.graph = graph;
        this.app.renderer.renderAll();
        this.app.editor.clearSelection();
        this.app.updateStatus();
        this.app.history = new M.History();
        this.app.saveHistory();
    };

    IO.prototype.autoSave = function() {
        try {
            var data = this.app.graph.toJSON();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            // localStorage might be full or unavailable
        }
    };

    IO.prototype.autoLoad = function() {
        try {
            var json = localStorage.getItem(STORAGE_KEY);
            if (json) {
                var data = JSON.parse(json);
                if (data && data.nodes && data.nodes.length > 0) {
                    this._loadFromData(data);
                    return true;
                }
            }
        } catch (e) {
            // Ignore errors
        }
        return false;
    };

    // ===== Sample Diagrams =====

    IO.prototype.loadSample = function(sampleName) {
        var data = this._getSampleData(sampleName);
        if (data) {
            this._loadFromData(data);
            this.app.setStatus('サンプル「' + data.name + '」を読み込みました');
        }
    };

    IO.prototype._getSampleData = function(name) {
        switch (name) {
            case 'economy':
                return this._sampleEconomy();
            case 'engine':
                return this._sampleEngine();
            case 'monopoly':
                return this._sampleMonopoly();
            default:
                return null;
        }
    };

    IO.prototype._sampleEconomy = function() {
        return {
            name: 'シンプル経済',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 200, y: 200,
                    properties: { name: '収入源', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_pool', type: 'pool', x: 400, y: 200,
                    properties: { name: '所持金', capacity: -1, startValue: 10, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_drain', type: 'drain', x: 600, y: 200,
                    properties: { name: '消費', activationMode: 'automatic', consumption: 1 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool', target: 'n_drain',
                    properties: { rate: 1, label: '' }
                }
            ]
        };
    };

    IO.prototype._sampleEngine = function() {
        return {
            name: 'ダイナミックエンジン',
            nodes: [
                {
                    id: 'n_mine', type: 'source', x: 150, y: 200,
                    properties: { name: '鉱山', activationMode: 'automatic', production: 2 }
                },
                {
                    id: 'n_ore', type: 'pool', x: 350, y: 200,
                    properties: { name: '鉱物', capacity: 50, startValue: 5, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_conv', type: 'converter', x: 500, y: 200,
                    properties: { name: '工場', inputRate: 3, outputRate: 1, activationMode: 'automatic' }
                },
                {
                    id: 'n_units', type: 'pool', x: 650, y: 200,
                    properties: { name: 'ユニット', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_mine', target: 'n_ore',
                    properties: { rate: 2, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_ore', target: 'n_conv',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c3', type: 'resourceConnection', source: 'n_conv', target: 'n_units',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c_state', type: 'stateConnection', source: 'n_units', target: 'n_mine',
                    properties: { stateType: 'nodeModifier', formula: 'self + 1', condition: '', label: '' }
                }
            ]
        };
    };

    IO.prototype._sampleMonopoly = function() {
        return {
            name: '正のフィードバック（モノポリー型）',
            nodes: [
                {
                    id: 'n_salary', type: 'source', x: 150, y: 200,
                    properties: { name: '給料', activationMode: 'automatic', production: 5 }
                },
                {
                    id: 'n_money', type: 'pool', x: 350, y: 200,
                    properties: { name: '所持金', capacity: -1, startValue: 20, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_conv', type: 'converter', x: 500, y: 200,
                    properties: { name: '不動産購入', inputRate: 10, outputRate: 1, activationMode: 'automatic' }
                },
                {
                    id: 'n_estate', type: 'pool', x: 650, y: 200,
                    properties: { name: '不動産', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_rent', type: 'source', x: 650, y: 80,
                    properties: { name: '家賃収入', activationMode: 'automatic', production: 0 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_salary', target: 'n_money',
                    properties: { rate: 5, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_money', target: 'n_conv',
                    properties: { rate: 10, label: '' }
                },
                {
                    id: 'c3', type: 'resourceConnection', source: 'n_conv', target: 'n_estate',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c4', type: 'resourceConnection', source: 'n_rent', target: 'n_money',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c_state', type: 'stateConnection', source: 'n_estate', target: 'n_rent',
                    properties: { stateType: 'nodeModifier', formula: 'self * 3', condition: '', label: '' }
                }
            ]
        };
    };

    M.IO = IO;

})(window.Machinations);
