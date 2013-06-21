/**
 * ESUI (Enterprise Simple UI)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file 树控件
 * @author otakustay
 */

define(
    function (require) {
        var Control = require('./Control');
        var lib = require('./lib');
        var helper = require('./controlHelper');
        
        var TreeStrategy = require('./TreeStrategy');

        /**
         * 不做任何事的`TreeStrategy`实现
         */
        function NullTreeStrategy() {
            TreeStrategy.apply(this, arguments);
        }

        /**
         * 不做任何事
         *
         * @override
         * @public
         */
        NullTreeStrategy.prototype.attachTo = function () {};

        lib.inherits(NullTreeStrategy, TreeStrategy);

        /**
        * 树控件
        */
        function Tree() {
            Control.apply(this, arguments);
        }

        Tree.prototype.type = 'Tree';

        /**
         * 创建主元素
         *
         * @return {HTMLElement} 主元素
         * @override
         * @protected
         */
        Tree.prototype.createMain = function () {
            return document.createElement('div');
        };

        /**
         * 初始化参数
         *
         * @param {Object} options 构造函数传入的参数
         * @override
         * @protected
         */
        Tree.prototype.initOptions = function (options) {
            var defaults = {
                datasource: {},
                strategy: new NullTreeStrategy()
            };
            var properties = lib.extend(defaults, options);
            this.setProperties(properties);
        };

        /**
         * 每个节点显示的内容的模板
         *
         * @type {string}
         * @public
         */
        Tree.prototype.itemTemplate = '<span>${text}</span>';

        /**
         * 获取每个节点显示的内容
         *
         * @param {Object} node 节点数据
         * @return {string} 节点的HTML
         * @public
         */
        Tree.prototype.getItemHTML = function (node) {
            var data = {
                id: lib.encodeHTML(node.id),
                text: lib.encodeHTML(node.text)
            };
            return lib.format(this.itemTemplate, data);
        };


        var indicatorTextMapping = {
            'collapsed': '展开',
            'expanded': '收起',
            'busy': '加载中',
            'empty': '无内容'
        };

        /**
         * 获取指示器（节点文字前的那个图标）的HTML
         *
         * @param {Tree} tree 控件实例
         * @param {Object} node 节点数据
         * @param {string} type 指示器的类型，为`empty`、`expanded`或`collapsed`
         * @return {string}
         * @inner
         */
        function getIndicatorHTML(tree, node, type) {
            var classes = [].concat(
                helper.getPartClasses(tree, 'node-indicator'),
                type 
                    ? helper.getPartClasses(tree, 'node-indicator-' + type)
                    : []
            );
            var html = '<span '
                + 'id="' + helper.getId(tree, 'indicator-' + node.id) + '" '
                + 'class="' + classes.join(' ') + '">'
                + indicatorTextMapping[type || 'collapsed'] + '</span>';
            return html;
        }

        /**
         * 获取节点的内容HTML
         *
         * @param {Tree} tree 控件实例
         * @param {Object} node 节点数据
         * @param {number} level 节点的层级，根是0层
         * @param {boolean} expanded 是否处于展开状态
         * @return {string}
         * @inner
         */
        function getNodeContentHTML(tree, node, level, expanded) {
            var wrapperClasses = helper.getPartClasses(tree, 'content-wrapper');
            var html = '<div class="' + wrapperClasses.join(' ') + '">';

            var indicatorType = tree.strategy.isLeafNode(node)
                ? 'empty'
                : (expanded ? 'expanded' : 'collapsed');
            html += getIndicatorHTML(tree, node, indicatorType);

            var itemWrapperClasses =
                helper.getPartClasses(tree, 'item-content');
            html += '<div class="' + itemWrapperClasses.join(' ') + '">'
                + tree.getItemHTML(node)
                + '</div>';

            html += '</div>';

            if (expanded && !tree.strategy.isLeafNode(node)) {
                var classes = [].concat(
                    helper.getPartClasses(tree, 'sub-root'),
                    helper.getPartClasses(tree, 'sub-root-' + indicatorType)
                );
                html += '<ul class="' + classes.join(' ') + '">';
                for (var i = 0; i < node.children.length; i++) {
                    var child = node.children[i];
                    html += getNodeHTML(
                        tree, 
                        child, 
                        level + 1, 
                        tree.strategy.shouldExpand(child)
                    );
                }
                html += '</ul>';
            }

            return html;
        }

        /**
         * 获取一个节点元素应有的class
         *
         * @param {Tree} tree 控件实例
         * @param {Object} node 对应的节点数据
         * @param {number} level 节点的层极，根是0层
         * @param {boolean} expanded 是否处于展开状态
         * @param {Array.<string>} 对应的节点元素应有的class
         * @inner
         */
        function getNodeClasses(tree, node, level, expanded) {
            var state = tree.strategy.isLeafNode(node)
                ? 'empty'
                : (expanded ? 'expanded' : 'collapsed');
            var classes = [].concat(
                helper.getPartClasses(tree, 'node'),
                helper.getPartClasses(tree, 'node-' + state),
                helper.getPartClasses(tree, 'node-level-' + level)
            );
            // 根节点再加2个类
            if (node === tree.datasource) {
                classes = [].concat(
                    helper.getPartClasses(tree, 'root'),
                    helper.getPartClasses(tree, 'root-' + state),
                    classes
                );
            }
            return classes;
        }

        /**
         * 获取节点的HTML
         *
         * @param {Tree} tree 控件实例
         * @param {Object} node 节点数据
         * @param {number} level 节点的层级，根是0层
         * @param {boolean} expanded 是否处于展开状态
         * @parma {string} nodeName 使用节点的类型，默认为li
         * @return {string}
         * @inner
         */
        function getNodeHTML(tree, node, level, expanded, nodeName) {
            nodeName = nodeName || 'li';
            var classes = getNodeClasses(tree, node, level, expanded);
            var html = '<' + nodeName + ' class="' + classes.join(' ') + '" '
                + 'id="' + helper.getId(tree, 'node-' + node.id) + '" '
                + 'data-id="' + node.id + '" data-level="' + level + '">';
            html += getNodeContentHTML(tree, node, level, expanded);
            html += '</' + nodeName + '>';
            return html;
        }

        /**
         * 根据节点的当前状态展开或收起节点
         *
         * @param {Tree} this 控件实例
         * @param {Event} e DOM事件对象
         * @inner
         */
        function toggleNode(e) {
            // 对于树控件来说，只有点在`.content-wrapper`上才是有效的，
            // 而`.content-wrapper`下只有2类元素：
            // 
            // - 提示元素，有`ui-tree-node-indicator`这个class，且没有子元素
            // - 内容元素，有`ui-tree-item-content`这个class，内容未知
            // 
            // 因此，首先判断是否点在提示元素上，如果不是则向上找看是不是能到wrapper
            var target = e.target;


            var indicatorClass = 
                helper.getPartClasses(this, 'node-indicator')[0];
            var isValidEvent = lib.hasClass(target, indicatorClass);


            var wrapperClass = 
                helper.getPartClasses(this, 'content-wrapper')[0];
            if (!isValidEvent && this.wideToggleArea) {
                while (target 
                    && target !== this.main 
                    && !lib.hasClass(target, wrapperClass)
                ) {
                    target = target.parentNode;
                }

                if (lib.hasClass(target, wrapperClass)) {
                    isValidEvent = true;
                }
            }

            if (isValidEvent) {
                // 往上找到树的节点，有`data-id`等有用的属性
                while (target 
                    && target !== this.main
                    && !lib.hasAttribute(target, 'data-id')
                ) {
                    target = target.parentNode;
                }
                var id = target.getAttribute('data-id');

                this.triggerToggleStrategy(id);
            }
        }

        /**
         * 初始化DOM结构
         *
         * @override
         * @protected
         */
        Tree.prototype.initStructure = function () {
            helper.addDOMEvent(this, this.main, 'click', toggleNode);
            this.strategy.attachTo(this);
        };

        /**
         * 构建节点的id->数据的索引
         *
         * @param {Object} node 节点数据，第一次调用时为根
         * @param {Object=} index 用于存放索引的对象，第一次调用时不传递
         * @return {Object}
         * @inner
         */
        function buildNodeIndex(node, index) {
            index = index || {};

            index[node.id] = node;
            if (node.children) {
                for (var i = 0; i < node.children.length; i++) {
                    buildNodeIndex(node.children[i], index);
                }
            }

            return index;
        }

        /**
         * 重绘
         *
         * @override
         * @protected
         */
        Tree.prototype.repaint = helper.createRepaint(
            Control.prototype.repaint,
            {
                name: 'datasource',
                paint: function (tree, datasource) {
                    tree.nodeIndex = buildNodeIndex(datasource);
                    tree.main.innerHTML = 
                        getNodeHTML(tree, datasource, 0, true, 'div');
                }
            }
        );

        /**
         * 向指定节点填充子节点并展开节点
         *
         * @param {string} id 节点的id
         * @param {Array.<Object>=} 子节点数据，如果不提供此参数，
         * 则控件按照以下逻辑执行：
         *
         * - 如果原本已经有子树的元素，则直接展开
         * - 如果原本没有子树元素，则取对应节点的`children`属性创建子树
         */
        Tree.prototype.expandNode = function (id, children) {
            var nodeElement = lib.g(helper.getId(this, 'node-' + id));

            if (!nodeElement) {
                return;
            }

            var level = +lib.getAttribute(nodeElement, 'data-level');
            // 更新过数据或者原本没有子树的情况下重绘
            if (children 
                || nodeElement.lastChild.nodeName.toLowerCase() !== 'ul'
            ) {
                var node = this.nodeIndex[id];
                if (!node) {
                    return;
                }
                if (children) {
                    node.children = children;
                }

                // 为了效率，直接刷掉原来的HTML
                nodeElement.innerHTML = 
                    getNodeContentHTML(this, node, level, true);
            }
            else {
                // 需要修改`indicator`的字样和class
                var indicator = lib.g(helper.getId(this, 'indicator-' + id));
                indicator.innerHTML = indicatorTextMapping.expanded;
                var indicatorClasses = [].concat(
                    helper.getPartClasses(this, 'node-indicator'),
                    helper.getPartClasses(this, 'node-indicator-expanded')
                );
                indicator.className = indicatorClasses.join(' ');
                // 子树的class要改掉
                var rootClasses = [].concat(
                    helper.getPartClasses(this, 'sub-root'),
                    helper.getPartClasses(this, 'sub-root-expanded')
                );
                nodeElement.lastChild.className = rootClasses.join(' ');
            }

            // CSS3动画可以通过这个class来操作
            var node = this.nodeIndex[id];
            var nodeClasses = getNodeClasses(this, node, level, true);
            nodeElement.className = nodeClasses.join(' ');
        };

        /**
         * 收起指定节点
         *
         * @param {string} id 节点的id
         * @param {boolean} removeChild 是否把子节点删除
         * @public
         */
        Tree.prototype.collapseNode = function (id, removeChild) {
            var nodeElement = lib.g(helper.getId(this, 'node-' + id));

            if (!nodeElement) {
                return;
            }

            var childRoot = nodeElement.getElementsByTagName('ul')[0];
            if (childRoot) {
                if (removeChild) {
                    childRoot.parentNode.removeChild(childRoot);
                }
                else {
                    var rootClasses = [].concat(
                        helper.getPartClasses(this, 'sub-root'),
                        helper.getPartClasses(this, 'sub-root-collapsed')
                    );
                    childRoot.className = rootClasses.join(' ');
                }
            }

            var node = this.nodeIndex[id];
            var level = +lib.getAttribute(nodeElement, 'data-level');
            var nodeClasses = getNodeClasses(this, node, level, false);
            nodeElement.className = nodeClasses.join(' ');
            var indicator = lib.g(helper.getId(this, 'indicator-' + id));
            var indicatorClasses = [].concat(
                helper.getPartClasses(this, 'node-indicator'),
                helper.getPartClasses(this, 'node-indicator-collapsed')
            );
            indicator.className = indicatorClasses.join(' ');
            indicator.innerHTML = indicatorTextMapping.collapsed;
        };

        /**
         * 判断一个节点是否为空
         *
         * @param {Tree} tree 控件实例
         * @param {HTMLElement} nodeElement 节点对应的DOM元素
         * @return {boolean}
         * @inner
         */
        function isEmpty(tree, nodeElement) {
            var className = helper.getPartClasses(tree, 'node-empty')[0];
            return lib.hasClass(nodeElement, className);
        }

        /**
         * 判断一个节点是否展开
         *
         * @param {Tree} tree 控件实例
         * @param {HTMLElement} nodeElement 节点对应的DOM元素
         * @return {boolean}
         * @inner
         */
        function isExpanded(tree, nodeElement) {
            var className = helper.getPartClasses(tree, 'node-expanded')[0];
            return lib.hasClass(nodeElement, className);
        }

        /**
         * 根据节点的状态展开或收起节点
         *
         * @param {string} id 节点的id
         * @param {Array.<Object>=} 子节点数据，参考`expandNode`方法
         * @param {boolean} removeChild 是否把子节点删除，参考`collapseNode`方法
         * @public
         */
        Tree.prototype.toggleNode = function (id, children, removeChild) {
            if (!this.nodeIndex[id]) {
                return;
            }

            var nodeElement = lib.g(helper.getId(this, 'node-' + id));

            if (!nodeElement) {
                return;
            }

            if (isEmpty(this, nodeElement)) {
                return;
            }

            if (isExpanded(this, nodeElement)) {
                this.collapseNode(id, removeChild);
            }
            else {
                this.expandNode(id, children);
            }
        };

        /**
         * 触发展开或收起节点的策略
         * 
         * 与`toggleNode`不同，该方法用来根据节点的状态，
         * 触发`expand`或`collapse`事件，以便使用`TreeStrategy`进行具体的策略
         * 
         * 在关联的`TreeStrategy`以外的逻辑，推荐使用此方法，而不是`toggleNode`
         *
         * @param {string} id 节点的id
         * @public
         */
        Tree.prototype.triggerToggleStrategy = function (id) {
            var node = this.nodeIndex[id];

            if (!node) {
                return;
            }

            var nodeElement = lib.g(helper.getId(this, 'node-' + id));

            if (!nodeElement) {
                return;
            }

            if (isEmpty(this, nodeElement)) {
                return;
            }

            var mode = isExpanded(this, nodeElement) ? 'collapse' : 'expand';
            this.fire(mode, { node: node });
        };

        /**
         * 修改指定节点为正在加载数据的繁忙状态
         *
         * @param {string} id 节点的id
         * @public
         */
        Tree.prototype.indicateNodeLoading = function (id) {
            var nodeElement = lib.g(helper.getId(this, 'node-' + id));
            if (!nodeElement) {
                return;
            }

            var indicator = nodeElement.firstChild;
            indicator.innerHTML = indicatorTextMapping.busy;
            var classes = [].concat(
                helper.getPartClasses(this, 'node-indicator'),
                helper.getPartClasses(this, 'node-indicator-busy')
            );
            indicator.className = classes.join(' ');
        };

        require('./main').register(Tree);
        lib.inherits(Tree, Control);
        return Tree;
    }
);