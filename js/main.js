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

        this._chartPanelVisible = false;

        this._initHeaderButtons();
        this._initEngine();
        this._initAutoSave();
        this._initTheme();
        this._initChartPanel();
        this._initFeedback();

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

        // Reset
        var btnReset = document.getElementById('btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', function() {
                self.resetSimulation();
            });
        }

        // Quick Run
        var btnQuickRun = document.getElementById('btn-quickrun');
        if (btnQuickRun) {
            btnQuickRun.addEventListener('click', function() {
                var steps = prompt('実行ステップ数を入力:', '100');
                if (steps && !isNaN(parseInt(steps))) {
                    if (self.engine.quickRun) {
                        self.engine.quickRun(parseInt(steps));
                    } else {
                        // Fallback: run steps synchronously
                        var count = parseInt(steps);
                        if (self.graph.stepCount === 0) {
                            self.engine._fireOnStartNodes();
                        }
                        for (var i = 0; i < count; i++) {
                            self.engine.step();
                        }
                    }
                    self.renderer.renderAll();
                    self.updateStatus();
                    self.propertiesPanel.refresh();
                    self.setStatus('高速実行完了 (' + steps + 'ステップ)');
                    self.saveHistory();
                }
            });
        }

        // Multiple Run (Monte Carlo)
        var btnMultiRun = document.getElementById('btn-multirun');
        if (btnMultiRun) {
            btnMultiRun.addEventListener('click', function() {
                self.showMonteCarloDialog();
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

                // Update chart data table
                self.updateChartPanel();
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
        this._chartPanelVisible = false;
        document.getElementById('chart-panel').style.display = 'none';
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

    // ===== Chart Data Panel =====

    App.prototype._initChartPanel = function() {
        var self = this;
        var panel = document.getElementById('chart-panel');
        var closeBtn = document.getElementById('chart-panel-close');
        var header = document.getElementById('chart-panel-header');

        closeBtn.addEventListener('click', function() {
            self._chartPanelVisible = false;
            panel.style.display = 'none';
        });

        // ドラッグでリサイズ
        var resizing = false;
        var startY = 0;
        var startH = 0;
        header.addEventListener('mousedown', function(e) {
            if (e.target === closeBtn) return;
            resizing = true;
            startY = e.clientY;
            startH = panel.offsetHeight;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!resizing) return;
            var newH = startH - (e.clientY - startY);
            if (newH < 80) newH = 80;
            if (newH > window.innerHeight * 0.6) newH = window.innerHeight * 0.6;
            panel.style.height = newH + 'px';
        });
        document.addEventListener('mouseup', function() {
            resizing = false;
        });
    };

    App.prototype.showChartPanel = function() {
        if (this._chartPanelVisible) return;
        this._chartPanelVisible = true;
        document.getElementById('chart-panel').style.display = 'flex';
    };

    App.prototype.updateChartPanel = function() {
        // チャートノードを収集
        var chartNodes = [];
        var allNodes = this.graph.getAllNodes();
        for (var i = 0; i < allNodes.length; i++) {
            if (allNodes[i].type === 'chart' && allNodes[i].chartData) {
                chartNodes.push(allNodes[i]);
            }
        }
        if (chartNodes.length === 0) return;

        // チャートノードがあればパネルを自動表示
        this.showChartPanel();

        // 全シリーズを統合: { seriesName: [values] }
        var allSeries = {};
        var seriesColors = {};
        var colors = ['#1976d2', '#e53935', '#43a047', '#ff9800', '#9c27b0', '#00bcd4'];
        var colorIdx = 0;
        var maxLen = 0;

        for (var c = 0; c < chartNodes.length; c++) {
            var cd = chartNodes[c].chartData;
            for (var name in cd) {
                if (!allSeries[name]) {
                    allSeries[name] = cd[name];
                    seriesColors[name] = colors[colorIdx % colors.length];
                    colorIdx++;
                } else {
                    allSeries[name] = cd[name];
                }
                if (cd[name].length > maxLen) maxLen = cd[name].length;
            }
        }

        // ヘッダー構築
        var thead = document.getElementById('chart-thead');
        var headerHtml = '<tr><th>Step</th>';
        var seriesNames = [];
        for (var name in allSeries) {
            seriesNames.push(name);
            var c = seriesColors[name] || '#666';
            headerHtml += '<th style="color:' + c + '">' + name + '</th>';
        }
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;

        // ボディ構築
        var tbody = document.getElementById('chart-tbody');
        var bodyHtml = '';
        for (var step = 0; step < maxLen; step++) {
            bodyHtml += '<tr><td>' + (step + 1) + '</td>';
            for (var s = 0; s < seriesNames.length; s++) {
                var data = allSeries[seriesNames[s]];
                var val = step < data.length ? data[step] : '';
                if (typeof val === 'number') val = Math.round(val * 100) / 100;
                bodyHtml += '<td>' + val + '</td>';
            }
            bodyHtml += '</tr>';
        }
        tbody.innerHTML = bodyHtml;

        // 最新行にスクロール
        var panelBody = document.getElementById('chart-panel-body');
        panelBody.scrollTop = panelBody.scrollHeight;
    };

    // ===== Feedback =====

    App.prototype._initFeedback = function() {
        var feedbackBtn = document.getElementById('feedback-btn');
        var feedbackModal = document.getElementById('feedback-modal');
        var feedbackClose = document.getElementById('feedback-close');
        var feedbackSubmit = document.getElementById('feedback-submit');

        feedbackBtn.addEventListener('click', function() {
            feedbackModal.style.display = 'flex';
        });

        feedbackClose.addEventListener('click', function() {
            feedbackModal.style.display = 'none';
        });

        feedbackModal.addEventListener('click', function(e) {
            if (e.target === feedbackModal) feedbackModal.style.display = 'none';
        });

        var self = this;
        feedbackSubmit.addEventListener('click', function() {
            var category = document.getElementById('feedback-category').value;
            var title = document.getElementById('feedback-title').value.trim();
            var body = document.getElementById('feedback-body').value.trim();

            if (!title) {
                alert('タイトルを入力してください');
                return;
            }

            // トークン取得: 1) ビルド注入 2) localStorage 3) 手動入力
            var token = window.__FEEDBACK_TOKEN__
                || localStorage.getItem('machinations_github_token');
            if (!token) {
                token = prompt(
                    'GitHub Personal Access Token を入力してください\n\n'
                    + '初回のみ必要です（ブラウザに保存されます）\n'
                    + 'Fine-Grained PAT を Issues: Read and Write 権限で作成:\n'
                    + 'https://github.com/settings/personal-access-tokens/new'
                );
                if (!token || !token.trim()) return;
                token = token.trim();
                localStorage.setItem('machinations_github_token', token);
            }

            // カテゴリ → ラベル/プレフィックス
            var labelMap = {
                enhancement: 'enhancement',
                bug: 'bug',
                improvement: 'improvement',
                other: 'question'
            };
            var prefixMap = {
                enhancement: '[新規実装]',
                bug: '[バグ]',
                improvement: '[改善要望]',
                other: '[その他]'
            };

            var issueTitle = prefixMap[category] + ' ' + title;
            var issueBody = body + '\n\n---\n_Machinations Web Simulator からのフィードバック_';
            var label = labelMap[category];

            // ボタンを無効化
            feedbackSubmit.disabled = true;
            feedbackSubmit.textContent = '送信中...';

            fetch('https://api.github.com/repos/dsgarage/machinations-web/issues', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github+json'
                },
                body: JSON.stringify({
                    title: issueTitle,
                    body: issueBody,
                    labels: [label]
                })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                feedbackSubmit.disabled = false;
                feedbackSubmit.textContent = 'GitHub Issue を作成';

                if (data.number) {
                    // 成功
                    document.getElementById('feedback-title').value = '';
                    document.getElementById('feedback-body').value = '';
                    feedbackModal.style.display = 'none';
                    self.setStatus('Issue #' + data.number + ' を作成しました');
                } else {
                    // トークンが無効な場合はクリアして再入力を促す
                    localStorage.removeItem('machinations_github_token');
                    alert('Issue 作成に失敗しました: ' + (data.message || 'エラー') + '\n\nトークンを再入力してください');
                }
            })
            .catch(function(err) {
                feedbackSubmit.disabled = false;
                feedbackSubmit.textContent = 'GitHub Issue を作成';
                alert('通信エラー: ' + err.message);
            });
        });
    };

    // ===== Monte Carlo =====

    App.prototype.showMonteCarloDialog = function() {
        var runs = prompt('実行回数:', '100');
        if (!runs || isNaN(parseInt(runs))) return;
        var steps = prompt('1回あたりのステップ数:', '50');
        if (!steps || isNaN(parseInt(steps))) return;

        runs = parseInt(runs);
        steps = parseInt(steps);

        this.setStatus('モンテカルロ実行中... (' + runs + '回 × ' + steps + 'ステップ)');

        var self = this;
        // Use setTimeout to allow status to render
        setTimeout(function() {
            var results;
            if (self.engine.multipleRun) {
                results = self.engine.multipleRun(runs, steps);
            } else {
                // Fallback: manual multiple run implementation
                results = self._runMonteCarlo(runs, steps);
            }

            // Restore graph state
            self.graph = self.engine.graph;
            self.renderer.graph = self.graph;
            self.renderer.renderAll();
            self.updateStatus();

            // Show results in modal
            self.showMonteCarloResults(results, runs, steps);
        }, 50);
    };

    App.prototype._runMonteCarlo = function(runs, steps) {
        var results = {};
        var graph = this.graph;

        // Collect pool node IDs and names before runs
        var poolNodes = [];
        var allNodes = graph.getAllNodes();
        for (var n = 0; n < allNodes.length; n++) {
            if (allNodes[n].type === 'pool') {
                poolNodes.push({ id: allNodes[n].id, name: allNodes[n].properties.name });
                results[allNodes[n].id] = { name: allNodes[n].properties.name, values: [] };
            }
        }

        // Save initial state
        var savedState = graph.toJSON();

        for (var r = 0; r < runs; r++) {
            // Reset graph to initial state
            var freshGraph = M.Graph.fromJSON(savedState);
            this.engine.graph = freshGraph;

            // Fire onStart nodes
            this.engine._fireOnStartNodes();

            // Run steps
            for (var s = 0; s < steps; s++) {
                this.engine.step();
            }

            // Collect final pool values
            for (var p = 0; p < poolNodes.length; p++) {
                var node = freshGraph.getNode(poolNodes[p].id);
                if (node) {
                    results[poolNodes[p].id].values.push(node.resources);
                }
            }
        }

        // Restore original graph
        var restoredGraph = M.Graph.fromJSON(savedState);
        this.graph = restoredGraph;
        this.engine.graph = restoredGraph;

        return results;
    };

    App.prototype.showMonteCarloResults = function(results, runs, steps) {
        var html = '<div class="modal-overlay" id="mc-modal" style="display:flex">';
        html += '<div class="modal-content">';
        html += '<div class="modal-header"><h2>モンテカルロ結果 (' + runs + '回 × ' + steps + 'ステップ)</h2>';
        html += '<button class="modal-close-btn" onclick="document.getElementById(\'mc-modal\').remove()">&times;</button></div>';
        html += '<div class="modal-body"><table style="width:100%;border-collapse:collapse">';
        html += '<tr style="border-bottom:2px solid var(--border-color,#ccc)"><th style="text-align:left;padding:8px">プール</th><th>平均</th><th>標準偏差</th><th>最小</th><th>最大</th></tr>';

        for (var nodeId in results) {
            var r = results[nodeId];
            var values = r.values;
            if (!values || values.length === 0) continue;

            var sum = 0, min = Infinity, max = -Infinity;
            for (var i = 0; i < values.length; i++) {
                sum += values[i];
                if (values[i] < min) min = values[i];
                if (values[i] > max) max = values[i];
            }
            var avg = sum / values.length;
            var variance = 0;
            for (var i = 0; i < values.length; i++) {
                variance += (values[i] - avg) * (values[i] - avg);
            }
            var stdDev = Math.sqrt(variance / values.length);

            html += '<tr style="border-bottom:1px solid var(--border-light,#eee)">';
            html += '<td style="padding:8px">' + (r.name || nodeId) + '</td>';
            html += '<td style="text-align:center">' + avg.toFixed(1) + '</td>';
            html += '<td style="text-align:center">' + stdDev.toFixed(1) + '</td>';
            html += '<td style="text-align:center">' + Math.round(min) + '</td>';
            html += '<td style="text-align:center">' + Math.round(max) + '</td>';
            html += '</tr>';
        }

        html += '</table></div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        // Click overlay to close
        var modal = document.getElementById('mc-modal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) this.remove();
            });
        }

        this.setStatus('モンテカルロ完了');
    };

    // ===== Initialize =====

    document.addEventListener('DOMContentLoaded', function() {
        window.Machinations.app = new App();
    });

    M.App = App;

})(window.Machinations);
