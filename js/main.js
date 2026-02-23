/**
 * main.js - Entry Point
 * Machinations Web Simulator
 */

(function(M) {
    'use strict';

    function App() {
        this.graph = new M.Graph();
        this.svg = document.getElementById('canvas');
        this.renderer = new M.Renderer(this.svg, this.graph);
        this.engine = new M.Engine(this.graph);
        this.propertiesPanel = new M.PropertiesPanel(
            document.getElementById('properties-panel'), this
        );
        this.toolbar = new M.Toolbar(document.getElementById('toolbar'), this);
        this.editor = new M.Editor(this);
        this.io = new M.IO(this);
        this.history = new M.History();

        this._isDark = false;
        this._autoSaveInterval = null;

        this._initHeaderButtons();
        this._initEngine();
        this._initAutoSave();
        this._initTheme();

        // Try auto-load, otherwise show empty
        if (!this.io.autoLoad()) {
            this.renderer.renderAll();
        }
        this.updateStatus();
        this.saveHistory();
    }

    App.prototype._initHeaderButtons = function() {
        var self = this;

        // New
        document.getElementById('btn-new').addEventListener('click', function() {
            self.newDiagram();
        });

        // Save
        document.getElementById('btn-save').addEventListener('click', function() {
            self.io.save();
        });

        // Load
        document.getElementById('btn-load').addEventListener('click', function() {
            self.io.load();
        });

        document.getElementById('file-input').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                self.io.handleFileLoad(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Run
        document.getElementById('btn-run').addEventListener('click', function() {
            self.startSimulation();
        });

        // Stop
        document.getElementById('btn-stop').addEventListener('click', function() {
            self.stopSimulation();
        });

        // Step
        document.getElementById('btn-step').addEventListener('click', function() {
            self.stepSimulation();
        });

        // Reset
        var btnReset = document.getElementById('btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', function() {
                self.resetSimulation();
            });
        }

        // Quick Run (placeholder)
        var btnQuickrun = document.getElementById('btn-quickrun');
        if (btnQuickrun) {
            btnQuickrun.addEventListener('click', function() {
                self.setStatus('高速実行は今後のバージョンで実装予定');
            });
        }

        // Multi Run (placeholder)
        var btnMultirun = document.getElementById('btn-multirun');
        if (btnMultirun) {
            btnMultirun.addEventListener('click', function() {
                self.setStatus('統計実行は今後のバージョンで実装予定');
            });
        }

        // Speed
        var speedSlider = document.getElementById('speed-slider');
        var speedValue = document.getElementById('speed-value');
        speedSlider.addEventListener('input', function() {
            speedValue.textContent = speedSlider.value;
            self.engine.setSpeed(parseInt(speedSlider.value));
        });

        // Undo/Redo
        document.getElementById('btn-undo').addEventListener('click', function() {
            self.undo();
        });
        document.getElementById('btn-redo').addEventListener('click', function() {
            self.redo();
        });

        // Sample modal
        var samplesBtn = document.getElementById('btn-samples');
        var sampleModal = document.getElementById('sample-modal');
        var modalClose = document.getElementById('modal-close');

        samplesBtn.addEventListener('click', function() {
            sampleModal.style.display = 'flex';
        });
        modalClose.addEventListener('click', function() {
            sampleModal.style.display = 'none';
        });
        sampleModal.addEventListener('click', function(e) {
            if (e.target === sampleModal) sampleModal.style.display = 'none';
        });

        var sampleCards = sampleModal.querySelectorAll('.sample-card');
        for (var i = 0; i < sampleCards.length; i++) {
            sampleCards[i].addEventListener('click', function(e) {
                var card = e.target.closest('.sample-card');
                var sampleName = card.getAttribute('data-sample');
                self.io.loadSample(sampleName);
                sampleModal.style.display = 'none';
            });
        }

        // Theme
        document.getElementById('btn-theme').addEventListener('click', function() {
            self.toggleTheme();
        });
    };

    App.prototype._initEngine = function() {
        var self = this;

        this.engine.onStep = function(stepCount, flows) {
            requestAnimationFrame(function() {
                // Batch update: all nodes in one frame
                var nodes = self.graph.getAllNodes();
                for (var i = 0; i < nodes.length; i++) {
                    self.renderer.updateNode(nodes[i]);
                }

                // Animate resource flows (limited)
                for (var j = 0; j < flows.length; j++) {
                    self.renderer.animateResourceFlow(flows[j]);
                }

                // Update status
                self.updateStatus();

                // Refresh properties panel
                self.propertiesPanel.refresh();
            });
        };

        this.engine.onEnd = function(stepCount) {
            self.stopSimulation();
            self.setStatus('シミュレーション終了 (ステップ ' + stepCount + ')');
        };
    };

    App.prototype._initAutoSave = function() {
        var self = this;
        this._autoSaveInterval = setInterval(function() {
            self.io.autoSave();
        }, 5000);
    };

    App.prototype._initTheme = function() {
        // Check stored preference
        var stored = localStorage.getItem('machinations_theme');
        if (stored === 'dark') {
            this.setDarkMode(true);
        }
    };

    // ===== Simulation Control =====

    App.prototype.startSimulation = function() {
        this.engine.start();
        document.getElementById('btn-run').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        this.setStatus('シミュレーション実行中...');
    };

    App.prototype.stopSimulation = function() {
        this.engine.stop();
        document.getElementById('btn-run').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        this.setStatus('シミュレーション停止');
    };

    App.prototype.toggleSimulation = function() {
        if (this.engine.running) {
            this.stopSimulation();
        } else {
            this.startSimulation();
        }
    };

    App.prototype.stepSimulation = function() {
        if (this.engine.running) return;
        if (this.graph.stepCount === 0) {
            this.engine._fireOnStartNodes();
        }
        this.engine.step();
    };

    App.prototype.resetSimulation = function() {
        this.engine.reset();
        this.renderer.renderAll();
        this.updateStatus();
        this.setStatus('シミュレーションリセット');
    };

    // ===== Diagram Management =====

    App.prototype.newDiagram = function() {
        this.engine.stop();
        this.graph = new M.Graph();
        this.engine.graph = this.graph;
        this.renderer.graph = this.graph;
        this.renderer.clear();
        this.editor.clearSelection();
        this.history = new M.History();
        this.updateStatus();
        document.getElementById('btn-run').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        this.setStatus('新規ダイアグラム');
        this.saveHistory();
    };

    // ===== Undo/Redo =====

    App.prototype.saveHistory = function() {
        this.history.push(this.graph.toJSON());
    };

    App.prototype.undo = function() {
        var state = this.history.undo(this.graph.toJSON());
        if (state) {
            this._restoreState(state);
            this.setStatus('元に戻しました');
        }
    };

    App.prototype.redo = function() {
        var state = this.history.redo(this.graph.toJSON());
        if (state) {
            this._restoreState(state);
            this.setStatus('やり直しました');
        }
    };

    App.prototype._restoreState = function(data) {
        var graph = M.Graph.fromJSON(data);
        this.graph = graph;
        this.engine.graph = graph;
        this.renderer.graph = graph;
        this.renderer.renderAll();
        this.editor.clearSelection();
        this.updateStatus();
    };

    // ===== Theme =====

    App.prototype.toggleTheme = function() {
        this.setDarkMode(!this._isDark);
    };

    App.prototype.setDarkMode = function(isDark) {
        this._isDark = isDark;
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        this.renderer.setDarkMode(isDark);

        var themeBtn = document.getElementById('btn-theme');
        themeBtn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';

        // Update grid
        var gridLine = document.querySelector('.grid-line');
        if (gridLine) {
            gridLine.style.stroke = isDark ? '#2a2a3e' : '#e0e0e0';
        }

        // Re-render to update colors
        this.renderer.renderAll();

        localStorage.setItem('machinations_theme', isDark ? 'dark' : 'light');
    };

    // ===== Status =====

    App.prototype.updateStatus = function() {
        document.getElementById('status-step').textContent = 'ステップ: ' + this.graph.stepCount;
        document.getElementById('status-nodes').textContent = 'ノード: ' + this.graph.getNodeCount();
        document.getElementById('status-connections').textContent = '接続: ' + this.graph.getConnectionCount();
        document.getElementById('status-resources').textContent = '総リソース: ' + Math.round(this.graph.getTotalResources());
    };

    App.prototype.setStatus = function(msg) {
        document.getElementById('status-info').textContent = msg;
    };

    // ===== Initialize =====

    document.addEventListener('DOMContentLoaded', function() {
        window.Machinations.app = new App();
    });

    M.App = App;

})(window.Machinations);
