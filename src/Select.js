define(
    function (require) {
        var lib = require('./lib');
        var helper = require('./controlHelper');
        var InputControl = require('./InputControl');

        /**
         * 下拉选择控件
         *
         * @param {Object=} options 构造控件的选项
         * @constructor
         */
        function Select(options) {
            InputControl.apply(this, arguments);
        }

        Select.prototype.type = 'Select';

        /**
         * 创建主元素
         *
         * @param {Object} options 构造函数传入的参数
         * @return {HTMLElement} 主元素
         * @override
         * @protected
         */
        Select.prototype.createMain = function (options) {
            return document.createElement('div');
        };

        /**
         * 根据`selectedIndex` < `value` < `rawValue`的顺序调整三个参数的值
         *
         * @param {Object} context 有可能包含以上3个参数的参数对象
         * @inner
         */
        function adjustValueProperties(context) {
            // 如果给了`selectedIndex`，且没有`value`和`rawValue`来覆盖，
            // 则以`selectedIndex`为准设定`rawValue`
            if (context.selectedIndex != null
                && context.value == null
                && context.rawValue == null
            ) {
                var selectedItem = context.datasource[context.selectedIndex];
                context.rawValue = selectedItem ? selectedItem.value : null;
            }
            else {
                // 如果给了`value`，则需要从其产生`rawValue`的值：
                // 
                // - 如果同时给了`rawValue`，以`rawValue`为准
                // - 否则使用`value`作为`rawValue`
                if (context.value != null) {
                    if (context.rawValue == null) {
                        context.rawValue = context.value; 
                    }
                    delete context.value;
                }

                // 当以`value`或`rawValue`为基准时，要同步一次`selectedIndex`
                context.selectedIndex = -1;
                for (var i = 0; i < context.datasource.length; i++) {
                    if (context.datasource[i].value == context.rawValue) {
                        context.selectedIndex = i;
                    }
                }
            }

            // 有可能更换过`datasource`，或者给了一个不存在的`value`，
            // 则会导致`selectedIndex`无法同步，
            // 因此如果`selectedIndex`在数组范围外或为初始值-1，要修正回来
            if (context.selectedIndex < 0 
                || context.selectedIndex >= context.datasource.length
            ) {
                context.selectedIndex = 0;
                context.rawValue = context.datasource[0]
                    ? context.datasource[0].value
                    : '';
            }
        }

        /**
         * 初始化参数
         *
         * @param {Object} options 构造函数传入的参数
         * @override
         * @protected
         */
        Select.prototype.initOptions = function (options) {
            var defaults = {
                datasource: []
            };

            var properties = {};
            lib.extend(properties, defaults, options);

            // 如果主元素是个`<select>`元素，则需要从元素中抽取数据源，
            // 这种情况下构造函数中传入的`datasource`无效
            if (this.main.nodeName.toLowerCase() === 'select') {
                properties.datasource = [];
                var elements = this.main.getElementsByTagName('option');
                for (var i = 0, length = elements.length; i < length; i++) {
                    var item = elements[i];
                    var dataItem = {
                        name: item.name || item.text, 
                        value: item.value
                    };

                    properties.datasource.push(dataItem);

                    // 已经选择的那个会作为值，
                    // 但如果构造函数中有传入和值相关的选项，则跳过这段逻辑
                    if (item.selected
                        && properties.selectedIndex == null
                        && properties.value == null
                        && properties.rawValue == null
                    ) {
                        properties.rawValue = item.value;
                        // 无值的话肯定是在最前面
                        properties.selectedIndex = item.value ? i : 0;
                    }
                }
            }

            adjustValueProperties(properties);

            lib.extend(this, properties);
        };

        /**
         * 获取下拉弹层的HTML
         *
         * @param {Select} select Select控件实例
         * @inner
         */
        function getLayerHTML(select) {
            // 拼接HTML需要缩进，去掉`white`配置
            /* jshint white: false */
            var itemTemplate = [
                '<li data-value="${value}">',
                    '<span>${text}</span>',
                '</li>'
            ];
            itemTemplate = itemTemplate.join('');
            var html = '';
            for (var i = 0; i < select.datasource.length; i++) {
                var item = select.datasource[i];
                if (item.value == select.value) {
                    select.selectedIndex = i;
                }
                var data = {
                    text: lib.encodeHTML(item.name || item.text),
                    value: lib.encodeHTML(item.value)
                };
                html += lib.format(itemTemplate, data);
            }
            return html;
        }

        /**
         * 获取弹出层的DOM元素
         *
         * @param {Select} select Select控件实例
         * @return {HTMLElement}
         * @innter
         */
        function getSelectionLayer(select) {
            return lib.g(helper.getId(select, 'layer'));
        }

        /**
         * 关闭下拉弹层
         *
         * @param {Select} select Select控件实例
         * @param {Event} 触发事件的事件对象
         * @inner
         */
        function closeLayer(select, e) {
            var target = e.target;
            var layer = getSelectionLayer(select);
            var main = select.main;

            if (!layer) {
                return;
            }

            while (target && (target !== layer && target !== main)) {
                target = target.parentNode;
            }

            if (target !== layer && target !== main) {
                hideLayer(select);
            }
        }

        /**
         * 根据下拉弹层的`click`事件设置值
         *
         * @param {Select} select Select控件实例
         * @param {Event} 触发事件的事件对象
         * @inner
         */
        function selectValue(select, e) {
            e = e || window.event;
            var target = e.target || e.srcElement;
            while (target && !target.hasAttribute('data-value')) {
                target = target.parentNode;
            }
            if (target) {
                var value = target.getAttribute('data-value');
                select.setRawValue(value);
            }
            hideLayer(select);
        }

        /**
         * 显示下拉弹层
         *
         * @param {Select} Select控件实例
         */
        function showLayer(select) {
            var layer = getSelectionLayer(select);
            var classes = helper.getPartClasses(select, 'layer-hidden');
            helper.layer.attachTo(
                layer, 
                select.main, 
                { top: 'bottom', left: 'left', right: 'right' }
            );
            lib.removeClasses(layer, classes);
            select.addState('active');
        }

        /**
         * 隐藏下拉弹层
         *
         * @param {Select} Select控件实例
         */
        function hideLayer(select) {
            var layer = getSelectionLayer(select);
            if (layer) {
                var classes = helper.getPartClasses(select, 'layer-hidden');
                lib.addClasses(layer, classes);
                select.removeState('active');
            }
        }

        /**
         * 打开下拉弹层
         *
         * @param {Select} select Select控件实例
         * @inner
         */
        function openLayer(select) {
            var layer = getSelectionLayer(select);
            if (!layer) {
                var layer = helper.layer.create('ol');
                layer.id = helper.getId(select, 'layer');
                layer.className = 
                    helper.getPartClasses(select, 'layer').join(' ');
                layer.innerHTML = getLayerHTML(select);
                document.body.appendChild(layer);

                helper.addDOMEvent(
                    select, 
                    layer, 
                    'click', 
                    lib.bind(selectValue, null, select)
                );
                var close = lib.bind(closeLayer, null, select);
                lib.on(document, 'mousedown', close);
                select.on(
                    'afterdispose',
                    function () {
                        lib.un(document, 'mousedown', close);
                    }
                );

                // 当`Select`作为别的控件的子控件时，
                // 别的控件也可能注册`document`上的`mousedown`关掉自己的弹层，
                // 这种情况下，如果`Select`把`mousedown`冒泡上去，
                // 则会因为选择一个子控件的内容导致父控件的弹层消失，
                // 因此这里要取消掉`mousedown`的冒泡来避免这问题的出现
                helper.addDOMEvent(
                    this, 
                    layer,
                    'mousedown',
                    function (e) { e.stopPropagation(); }
                );
            }

            showLayer(select);

            // 同步选择状态
            var items = layer.getElementsByTagName('li');
            for (var i = items.length - 1; i >= 0; i--) {
                var item = items[i];
                var classes = helper.getPartClasses(select, 'layer-selected');
                if (item.getAttribute('data-value') == select.rawValue) {
                    lib.addClasses(item, classes);
                }
                else {
                    lib.removeClass(item, classes);
                }
            }

            return layer;
        }

        /**
         * 根据下拉弹层当前状态打开或关闭之
         *
         * @param {Select} select Select控件实例
         * @param {Event} e 触发事件的事件对象
         * @inner
         */
        function toggleLayer(select, e) {
            var layer = getSelectionLayer(select);
            if (!layer) {
                layer = openLayer(select);
            }
            else {
                var classes = helper.getPartClasses(select, 'layer-hidden');
                if (lib.hasClass(layer, classes[0])) {
                    showLayer(select);
                }
                else {
                    hideLayer(select);
                }
            }
        }

        /**
         * 初始化DOM结构
         *
         * @override
         * @protected
         */
        Select.prototype.initStructure = function () {
            // 如果主元素是`<select>`，删之替换成`<div>`
            if (this.main.nodeName.toLowerCase() === 'select') {
                var main = this.createMain();
                lib.insertBefore(main, this.main);
                this.main.parentNode.removeChild(this.main);
                this.main = main;
            }

            this.main.tabIndex = 0;
            
            var html = [
                '<span></span>',
                '<input type="hidden" name="${name}" />'
            ];
            this.main.innerHTML = lib.format(
                html.join('\n'),
                { name: this.name }
            );

            helper.addDOMEvent(
                this, this.main, 'click', lib.bind(toggleLayer, null, this));
        };

        /**
         * 根据控件的值更新其视图
         *
         * @param {Select} select Select控件实例
         * @inner
         */
        function updateValue(select) {
            // 同步`value`
            var hidden = select.main.getElementsByTagName('input')[0];
            hidden.value = select.rawValue;

            // 同步显示的文字
            var selectedItem = select.datasource[select.selectedIndex];
            var displayText = selectedItem 
                ? (selectedItem.name || selectedItem.text)
                : '';
            var textHolder = select.main.getElementsByTagName('span')[0];
            textHolder.innerHTML = lib.encodeHTML(displayText);
        }

        var paint = require('./painters');

        /**
         * 重绘
         *
         * @param {Array=} 更新过的属性集合
         * @override
         * @protected
         */
        Select.prototype.repaint = helper.createRepaint(
            InputControl.prototype.repaint,
            paint.style('width'),
            paint.style('height'),
            paint.html('datasource', 'layer', getLayerHTML),
            {
                name: 'rawValue',
                paint: updateValue
            },
            {
                name: ['disabled', 'hidden', 'readOnly'],
                paint: function (select, disabled, hidden, readOnly) {
                    if (disabled || hidden || readOnly) {
                        hideLayer(select);
                    }
                }
            }
        );

        /**
         * 批量更新属性并重绘
         *
         * @param {Object} 需更新的属性
         * @override
         * @public
         */
        Select.prototype.setProperties = function (properties) {
            // 为了`adjustValueProperties`正常工作，需要加上一点东西，
            // 由于在`setProperties`有相等判断，所以额外加相同的东西不影响逻辑
            if (properties.datasource == null) {
                properties.datasource = this.datasource;
            }
            if (properties.value == null
                && properties.rawValue == null
                && properties.selectedIndex == null
            ) {
                properties.rawValue = this.rawValue;
            }

            adjustValueProperties(properties);
            var changes = 
                InputControl.prototype.setProperties.apply(this, arguments);

            if (changes.hasOwnProperty('rawValue')) {
                this.fire('change');
            }

            return changes;
        };

        /**
         * 销毁控件
         *
         * @public
         */
        Select.prototype.dispose = function () {
            var layer = getSelectionLayer(this);
            if (layer) {
                layer.parentNode.removeChild(layer);
            }

            InputControl.prototype.dispose.apply(this, arguments);
        };

        lib.inherits(Select, InputControl);
        require('./main').register(Select);
        return Select;
    }
);