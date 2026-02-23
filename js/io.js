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
        // Stop running simulation and reset state
        this.app.engine.stop();
        document.getElementById('btn-run').disabled = false;
        document.getElementById('btn-stop').disabled = true;

        var graph = M.Graph.fromJSON(data);
        this.app.graph = graph;
        this.app.engine.graph = graph;
        this.app.renderer.graph = graph;
        this.app.renderer.renderAll();
        this.app.editor.clearSelection();
        this.app.propertiesPanel.clear();
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
            case 'staticEngine':
                return this._sampleStaticEngine();
            case 'converterEngine':
                return this._sampleConverterEngine();
            case 'staticFriction':
                return this._sampleStaticFriction();
            case 'dynamicFriction':
                return this._sampleDynamicFriction();
            case 'attrition':
                return this._sampleAttrition();
            case 'negativeFeedback':
                return this._sampleNegativeFeedback();
            case 'riskCore':
                return this._sampleRiskCore();
            case 'simwar':
                return this._sampleSimWar();
            case 'diceGate':
                return this._sampleDiceGate();
            case 'playerSkill':
                return this._samplePlayerSkill();
            case 'metaDynamic':
                return this._sampleMetaDynamic();
            case 'multiplayerDynamic':
                return this._sampleMultiplayerDynamic();
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

    // ===== Design Patterns (Appendix B) =====

    IO.prototype._sampleStaticEngine = function() {
        return {
            name: '静的エンジン',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 150, y: 200,
                    properties: { name: '生産源', activationMode: 'automatic', production: 2 }
                },
                {
                    id: 'n_pool', type: 'pool', x: 350, y: 200,
                    properties: { name: 'リソース', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_drain', type: 'drain', x: 550, y: 200,
                    properties: { name: '消費', activationMode: 'automatic', consumption: 1 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool',
                    properties: { rate: 2, label: '固定生産' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool', target: 'n_drain',
                    properties: { rate: 1, label: '固定消費' }
                }
            ]
        };
    };

    IO.prototype._sampleConverterEngine = function() {
        return {
            name: 'コンバーターエンジン',
            nodes: [
                {
                    id: 'n_srcA', type: 'source', x: 100, y: 150,
                    properties: { name: '素材源', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_poolA', type: 'pool', x: 280, y: 150,
                    properties: { name: '素材A', capacity: -1, startValue: 10, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_conv1', type: 'converter', x: 450, y: 150,
                    properties: { name: '精錬所', inputRate: 3, outputRate: 1, activationMode: 'automatic' }
                },
                {
                    id: 'n_poolB', type: 'pool', x: 620, y: 150,
                    properties: { name: '製品B', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_conv2', type: 'converter', x: 450, y: 320,
                    properties: { name: 'リサイクル', inputRate: 2, outputRate: 1, activationMode: 'automatic' }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_srcA', target: 'n_poolA',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_poolA', target: 'n_conv1',
                    properties: { rate: 3, label: '3:1' }
                },
                {
                    id: 'c3', type: 'resourceConnection', source: 'n_conv1', target: 'n_poolB',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c4', type: 'resourceConnection', source: 'n_poolB', target: 'n_conv2',
                    properties: { rate: 2, label: '2:1' }
                },
                {
                    id: 'c5', type: 'resourceConnection', source: 'n_conv2', target: 'n_poolA',
                    properties: { rate: 1, label: '' }
                }
            ]
        };
    };

    IO.prototype._sampleStaticFriction = function() {
        return {
            name: '静的摩擦',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 150, y: 200,
                    properties: { name: '収入', activationMode: 'automatic', production: 5 }
                },
                {
                    id: 'n_pool', type: 'pool', x: 380, y: 200,
                    properties: { name: '資金', capacity: -1, startValue: 20, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_drain', type: 'drain', x: 600, y: 200,
                    properties: { name: '固定維持費', activationMode: 'automatic', consumption: 3 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool',
                    properties: { rate: 5, label: '収入' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool', target: 'n_drain',
                    properties: { rate: 3, label: '維持費' }
                }
            ]
        };
    };

    IO.prototype._sampleDynamicFriction = function() {
        return {
            name: '動的摩擦',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 150, y: 200,
                    properties: { name: '収入', activationMode: 'automatic', production: 5 }
                },
                {
                    id: 'n_pool', type: 'pool', x: 380, y: 200,
                    properties: { name: '資産', capacity: -1, startValue: 10, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_drain', type: 'drain', x: 600, y: 200,
                    properties: { name: '維持費', activationMode: 'automatic', consumption: 1 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool',
                    properties: { rate: 5, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool', target: 'n_drain',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c_state', type: 'stateConnection', source: 'n_pool', target: 'n_drain',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, self * 0.2)', condition: '', label: '保有量×0.2' }
                }
            ]
        };
    };

    IO.prototype._sampleAttrition = function() {
        return {
            name: '消耗（Attrition）',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 150, y: 200,
                    properties: { name: '補充', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_pool', type: 'pool', x: 380, y: 200,
                    properties: { name: '兵士', capacity: -1, startValue: 20, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_drain', type: 'drain', x: 600, y: 200,
                    properties: { name: '戦闘損失', activationMode: 'automatic', consumption: 1 }
                },
                {
                    id: 'n_drain2', type: 'drain', x: 380, y: 370,
                    properties: { name: '自然減', activationMode: 'automatic', consumption: 1 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool',
                    properties: { rate: 3, label: '補充' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool', target: 'n_drain',
                    properties: { rate: 1, label: '戦闘' }
                },
                {
                    id: 'c3', type: 'resourceConnection', source: 'n_pool', target: 'n_drain2',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c_state', type: 'stateConnection', source: 'n_pool', target: 'n_drain2',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, Math.round(self * 0.1))', condition: '', label: '保有量の10%' }
                }
            ]
        };
    };

    IO.prototype._sampleNegativeFeedback = function() {
        return {
            name: '負のフィードバック',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 150, y: 200,
                    properties: { name: '生産', activationMode: 'automatic', production: 5 }
                },
                {
                    id: 'n_pool', type: 'pool', x: 380, y: 200,
                    properties: { name: 'リソース', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_drain', type: 'drain', x: 600, y: 200,
                    properties: { name: '消費', activationMode: 'automatic', consumption: 1 }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool',
                    properties: { rate: 5, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool', target: 'n_drain',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c_state1', type: 'stateConnection', source: 'n_pool', target: 'n_src',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, 5 - self * 0.2)', condition: '', label: '多いほど生産減' }
                },
                {
                    id: 'c_state2', type: 'stateConnection', source: 'n_pool', target: 'n_drain',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, self * 0.3)', condition: '', label: '多いほど消費増' }
                }
            ]
        };
    };

    // ===== Real Game Analysis =====

    IO.prototype._sampleRiskCore = function() {
        return {
            name: 'リスク: コアメカニクス',
            nodes: [
                {
                    id: 'n_srcP1', type: 'source', x: 100, y: 120,
                    properties: { name: 'P1徴兵', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_armyP1', type: 'pool', x: 280, y: 120,
                    properties: { name: 'P1軍隊', capacity: -1, startValue: 10, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_territory', type: 'pool', x: 450, y: 220,
                    properties: { name: '領土(P1)', capacity: 42, startValue: 14, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_armyP2', type: 'pool', x: 620, y: 320,
                    properties: { name: 'P2軍隊', capacity: -1, startValue: 10, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_srcP2', type: 'source', x: 790, y: 320,
                    properties: { name: 'P2徴兵', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_battle', type: 'drain', x: 450, y: 400,
                    properties: { name: '戦闘損失', activationMode: 'automatic', consumption: 'D6' }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_srcP1', target: 'n_armyP1',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_srcP2', target: 'n_armyP2',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c3', type: 'resourceConnection', source: 'n_armyP1', target: 'n_battle',
                    properties: { rate: 'D6', label: '攻撃' }
                },
                {
                    id: 'c4', type: 'resourceConnection', source: 'n_armyP2', target: 'n_battle',
                    properties: { rate: 'D6', label: '防御' }
                },
                {
                    id: 'c_state1', type: 'stateConnection', source: 'n_territory', target: 'n_srcP1',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, Math.round(self / 5))', condition: '', label: '領土→徴兵力' }
                }
            ]
        };
    };

    IO.prototype._sampleSimWar = function() {
        return {
            name: 'SimWar: 2プレイヤーRTS',
            nodes: [
                // Player 1
                {
                    id: 'n_mine1', type: 'source', x: 80, y: 100,
                    properties: { name: 'P1鉱山', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_gold1', type: 'pool', x: 220, y: 100,
                    properties: { name: 'P1資金', capacity: -1, startValue: 20, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_conv1', type: 'converter', x: 380, y: 100,
                    properties: { name: 'P1兵舎', inputRate: 5, outputRate: 1, activationMode: 'automatic' }
                },
                {
                    id: 'n_army1', type: 'pool', x: 540, y: 100,
                    properties: { name: 'P1軍隊', capacity: -1, startValue: 3, activationMode: 'passive', pullMode: 'pull' }
                },
                // Player 2
                {
                    id: 'n_mine2', type: 'source', x: 80, y: 350,
                    properties: { name: 'P2鉱山', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'n_gold2', type: 'pool', x: 220, y: 350,
                    properties: { name: 'P2資金', capacity: -1, startValue: 20, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_conv2', type: 'converter', x: 380, y: 350,
                    properties: { name: 'P2兵舎', inputRate: 5, outputRate: 1, activationMode: 'automatic' }
                },
                {
                    id: 'n_army2', type: 'pool', x: 540, y: 350,
                    properties: { name: 'P2軍隊', capacity: -1, startValue: 3, activationMode: 'passive', pullMode: 'pull' }
                },
                // Battle
                {
                    id: 'n_battle', type: 'drain', x: 540, y: 225,
                    properties: { name: '戦闘', activationMode: 'automatic', consumption: 'D6' }
                }
            ],
            connections: [
                // P1 economy
                {
                    id: 'c1a', type: 'resourceConnection', source: 'n_mine1', target: 'n_gold1',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c1b', type: 'resourceConnection', source: 'n_gold1', target: 'n_conv1',
                    properties: { rate: 5, label: '' }
                },
                {
                    id: 'c1c', type: 'resourceConnection', source: 'n_conv1', target: 'n_army1',
                    properties: { rate: 1, label: '' }
                },
                // P2 economy
                {
                    id: 'c2a', type: 'resourceConnection', source: 'n_mine2', target: 'n_gold2',
                    properties: { rate: 3, label: '' }
                },
                {
                    id: 'c2b', type: 'resourceConnection', source: 'n_gold2', target: 'n_conv2',
                    properties: { rate: 5, label: '' }
                },
                {
                    id: 'c2c', type: 'resourceConnection', source: 'n_conv2', target: 'n_army2',
                    properties: { rate: 1, label: '' }
                },
                // Battle
                {
                    id: 'c_bat1', type: 'resourceConnection', source: 'n_army1', target: 'n_battle',
                    properties: { rate: 'D6', label: 'P1攻撃' }
                },
                {
                    id: 'c_bat2', type: 'resourceConnection', source: 'n_army2', target: 'n_battle',
                    properties: { rate: 'D6', label: 'P2攻撃' }
                },
                // Feedback: more army → more mine production
                {
                    id: 'c_fb1', type: 'stateConnection', source: 'n_army1', target: 'n_mine1',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, Math.round(self * 0.5))', condition: '', label: '軍事力→経済' }
                },
                {
                    id: 'c_fb2', type: 'stateConnection', source: 'n_army2', target: 'n_mine2',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, Math.round(self * 0.5))', condition: '', label: '軍事力→経済' }
                }
            ]
        };
    };

    IO.prototype._sampleDiceGate = function() {
        return {
            name: 'ダイスゲート',
            nodes: [
                {
                    id: 'n_src', type: 'source', x: 150, y: 220,
                    properties: { name: 'リソース源', activationMode: 'automatic', production: 'D6' }
                },
                {
                    id: 'n_pool_in', type: 'pool', x: 320, y: 220,
                    properties: { name: '入力プール', capacity: -1, startValue: 10, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_gate', type: 'gate', x: 480, y: 220,
                    properties: { name: 'ダイスゲート', gateType: 'probabilistic', distribution: '50,30,20', activationMode: 'automatic' }
                },
                {
                    id: 'n_poolA', type: 'pool', x: 650, y: 100,
                    properties: { name: '報酬A（高確率）', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_poolB', type: 'pool', x: 650, y: 220,
                    properties: { name: '報酬B（中確率）', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'n_poolC', type: 'pool', x: 650, y: 340,
                    properties: { name: '報酬C（低確率）', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                }
            ],
            connections: [
                {
                    id: 'c1', type: 'resourceConnection', source: 'n_src', target: 'n_pool_in',
                    properties: { rate: 'D6', label: 'D6' }
                },
                {
                    id: 'c2', type: 'resourceConnection', source: 'n_pool_in', target: 'n_gate',
                    properties: { rate: 1, label: '' }
                },
                {
                    id: 'c3', type: 'resourceConnection', source: 'n_gate', target: 'n_poolA',
                    properties: { rate: 1, label: '50%' }
                },
                {
                    id: 'c4', type: 'resourceConnection', source: 'n_gate', target: 'n_poolB',
                    properties: { rate: 1, label: '30%' }
                },
                {
                    id: 'c5', type: 'resourceConnection', source: 'n_gate', target: 'n_poolC',
                    properties: { rate: 1, label: '20%' }
                }
            ]
        };
    };

    // ===== Determinability Patterns =====

    IO.prototype._samplePlayerSkill = function() {
        return {
            name: 'Player Skill: テトリス型スキル分析',
            nodes: [
                {
                    id: 'ps_src', type: 'source', x: 120, y: 200,
                    properties: { name: 'ブロック落下', activationMode: 'automatic', production: 'D6' }
                },
                {
                    id: 'ps_field', type: 'pool', x: 320, y: 200,
                    properties: { name: 'フィールド', capacity: 20, startValue: 5, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'ps_drain', type: 'drain', x: 520, y: 200,
                    properties: { name: 'ライン消去', activationMode: 'automatic', consumption: 5 }
                },
                {
                    id: 'ps_skill', type: 'register', x: 520, y: 60,
                    properties: { name: 'スキル', value: 5, formula: '' }
                },
                {
                    id: 'ps_end', type: 'endCondition', x: 320, y: 360,
                    properties: { name: 'GAME OVER', condition: '{フィールド} >= 20' }
                },
                {
                    id: 'ps_chart', type: 'chart', x: 700, y: 200,
                    properties: { name: 'スキル分析', activationMode: 'passive', maxDataPoints: 200 }
                }
            ],
            connections: [
                {
                    id: 'ps_c1', type: 'resourceConnection', source: 'ps_src', target: 'ps_field',
                    properties: { rate: 'D6', label: 'D6' }
                },
                {
                    id: 'ps_c2', type: 'resourceConnection', source: 'ps_field', target: 'ps_drain',
                    properties: { rate: 5, label: '' }
                },
                {
                    id: 'ps_s1', type: 'stateConnection', source: 'ps_skill', target: 'ps_drain',
                    properties: { stateType: 'nodeModifier', formula: 'self', condition: '', label: 'スキル→消去速度' }
                },
                {
                    id: 'ps_s2', type: 'stateConnection', source: 'ps_field', target: 'ps_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                },
                {
                    id: 'ps_s3', type: 'stateConnection', source: 'ps_skill', target: 'ps_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                }
            ]
        };
    };

    IO.prototype._sampleMetaDynamic = function() {
        return {
            name: 'Meta-dynamic: 攻守の戦略的投資',
            nodes: [
                // 戦略パラメータ
                {
                    id: 'md_ratio', type: 'register', x: 100, y: 60,
                    properties: { name: '攻撃偏重度', value: 7, formula: '' }
                },
                // 経済
                {
                    id: 'md_income', type: 'source', x: 100, y: 200,
                    properties: { name: '経済収入', activationMode: 'automatic', production: 5 }
                },
                {
                    id: 'md_fund', type: 'pool', x: 280, y: 200,
                    properties: { name: '資金', capacity: -1, startValue: 30, activationMode: 'passive', pullMode: 'pull' }
                },
                // 攻撃系
                {
                    id: 'md_atkSrc', type: 'source', x: 460, y: 100,
                    properties: { name: '攻撃投資', activationMode: 'automatic', production: 7 }
                },
                {
                    id: 'md_atk', type: 'pool', x: 640, y: 100,
                    properties: { name: '攻撃力', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                // 防御系
                {
                    id: 'md_defSrc', type: 'source', x: 460, y: 300,
                    properties: { name: '防御投資', activationMode: 'automatic', production: 3 }
                },
                {
                    id: 'md_def', type: 'pool', x: 640, y: 300,
                    properties: { name: '防御力', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                // 敵側
                {
                    id: 'md_enemyAtk', type: 'source', x: 460, y: 450,
                    properties: { name: '敵の攻撃', activationMode: 'automatic', production: 5 }
                },
                {
                    id: 'md_damage', type: 'pool', x: 640, y: 450,
                    properties: { name: '被害蓄積', capacity: -1, startValue: 0, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'md_enemyHp', type: 'pool', x: 820, y: 100,
                    properties: { name: '敵HP', capacity: -1, startValue: 30, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'md_atkDrain', type: 'drain', x: 820, y: 200,
                    properties: { name: '敵損耗', activationMode: 'automatic', consumption: 0 }
                },
                // 終了条件
                {
                    id: 'md_win', type: 'endCondition', x: 820, y: 300,
                    properties: { name: '勝利/敗北', condition: '{敵HP} <= 0 || {被害蓄積} >= 30' }
                },
                // チャート
                {
                    id: 'md_chart', type: 'chart', x: 820, y: 450,
                    properties: { name: '戦略分析', activationMode: 'passive', maxDataPoints: 200 }
                }
            ],
            connections: [
                // 経済 → 攻撃・防御は独立source（資金は直接使わず比喩的に表現）
                // 攻撃偏重度 → 攻撃投資の生産量
                {
                    id: 'md_s1', type: 'stateConnection', source: 'md_ratio', target: 'md_atkSrc',
                    properties: { stateType: 'nodeModifier', formula: 'self', condition: '', label: '偏重度→攻撃' }
                },
                // 攻撃偏重度 → 防御投資の生産量（10 - 偏重度）
                {
                    id: 'md_s2', type: 'stateConnection', source: 'md_ratio', target: 'md_defSrc',
                    properties: { stateType: 'nodeModifier', formula: '10 - self', condition: '', label: '残り→防御' }
                },
                // 攻撃投資 → 攻撃力
                {
                    id: 'md_c1', type: 'resourceConnection', source: 'md_atkSrc', target: 'md_atk',
                    properties: { rate: 7, label: '' }
                },
                // 防御投資 → 防御力
                {
                    id: 'md_c2', type: 'resourceConnection', source: 'md_defSrc', target: 'md_def',
                    properties: { rate: 3, label: '' }
                },
                // 敵の攻撃 → 被害蓄積
                {
                    id: 'md_c3', type: 'resourceConnection', source: 'md_enemyAtk', target: 'md_damage',
                    properties: { rate: 5, label: '' }
                },
                // 防御力 → 敵の攻撃を軽減
                {
                    id: 'md_s3', type: 'stateConnection', source: 'md_def', target: 'md_enemyAtk',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, 5 - self * 0.15)', condition: '', label: '防御→被害軽減' }
                },
                // 攻撃力 → 敵へのダメージ
                {
                    id: 'md_s4', type: 'stateConnection', source: 'md_atk', target: 'md_atkDrain',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(0, self * 0.3)', condition: '', label: '攻撃力→敵損耗' }
                },
                // 敵HP → 敵損耗
                {
                    id: 'md_c4', type: 'resourceConnection', source: 'md_enemyHp', target: 'md_atkDrain',
                    properties: { rate: 1, label: '' }
                },
                // チャートへの接続
                {
                    id: 'md_s5', type: 'stateConnection', source: 'md_atk', target: 'md_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                },
                {
                    id: 'md_s6', type: 'stateConnection', source: 'md_def', target: 'md_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                },
                {
                    id: 'md_s7', type: 'stateConnection', source: 'md_enemyHp', target: 'md_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                },
                {
                    id: 'md_s8', type: 'stateConnection', source: 'md_damage', target: 'md_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                }
            ]
        };
    };

    IO.prototype._sampleMultiplayerDynamic = function() {
        return {
            name: 'Multiplayer-dynamic: 格闘ゲーム読み合い',
            nodes: [
                // P1
                {
                    id: 'mp_p1hp', type: 'pool', x: 200, y: 120,
                    properties: { name: 'P1体力', capacity: 30, startValue: 30, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'mp_p1dmg', type: 'drain', x: 200, y: 280,
                    properties: { name: 'P1被弾', activationMode: 'automatic', consumption: 'D6' }
                },
                {
                    id: 'mp_p1read', type: 'register', x: 600, y: 50,
                    properties: { name: 'P1読み力', value: 5, formula: '' }
                },
                // P2
                {
                    id: 'mp_p2hp', type: 'pool', x: 600, y: 120,
                    properties: { name: 'P2体力', capacity: 30, startValue: 30, activationMode: 'passive', pullMode: 'pull' }
                },
                {
                    id: 'mp_p2dmg', type: 'drain', x: 600, y: 280,
                    properties: { name: 'P2被弾', activationMode: 'automatic', consumption: 'D6' }
                },
                {
                    id: 'mp_p2read', type: 'register', x: 200, y: 50,
                    properties: { name: 'P2読み力', value: 5, formula: '' }
                },
                // 終了条件
                {
                    id: 'mp_end', type: 'endCondition', x: 400, y: 400,
                    properties: { name: 'KO', condition: '{P1体力} <= 0 || {P2体力} <= 0' }
                },
                // チャート
                {
                    id: 'mp_chart', type: 'chart', x: 400, y: 120,
                    properties: { name: 'HP推移', activationMode: 'passive', maxDataPoints: 200 }
                }
            ],
            connections: [
                // P1体力 → P1被弾（P2の攻撃でP1が減る）
                {
                    id: 'mp_c1', type: 'resourceConnection', source: 'mp_p1hp', target: 'mp_p1dmg',
                    properties: { rate: 'D6', label: '' }
                },
                // P2体力 → P2被弾（P1の攻撃でP2が減る）
                {
                    id: 'mp_c2', type: 'resourceConnection', source: 'mp_p2hp', target: 'mp_p2dmg',
                    properties: { rate: 'D6', label: '' }
                },
                // P1の読み力 → P2へのダメージを増加
                {
                    id: 'mp_s1', type: 'stateConnection', source: 'mp_p1read', target: 'mp_p2dmg',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, D6 * self / 5)', condition: '', label: 'P1読み→P2ダメージ' }
                },
                // P2の読み力 → P1へのダメージを増加
                {
                    id: 'mp_s2', type: 'stateConnection', source: 'mp_p2read', target: 'mp_p1dmg',
                    properties: { stateType: 'nodeModifier', formula: 'Math.max(1, D6 * self / 5)', condition: '', label: 'P2読み→P1ダメージ' }
                },
                // チャートへの接続
                {
                    id: 'mp_s3', type: 'stateConnection', source: 'mp_p1hp', target: 'mp_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                },
                {
                    id: 'mp_s4', type: 'stateConnection', source: 'mp_p2hp', target: 'mp_chart',
                    properties: { stateType: 'labelModifier', formula: '', condition: '', label: '' }
                }
            ]
        };
    };

    M.IO = IO;

})(window.Machinations);
