define(
    function (require) {
        var Panel = require('./Panel');

        /**
         * 表单控件
         *
         * @param {Object=} options 构造控件的选项
         * @constructor
         */
        function Form(options) {
            Panel.apply(this, arguments);
        }

        Form.prototype.type = 'Form';

        /**
         * 创建主元素
         *
         * @param {Object} options 构造函数传入的参数
         * @return {HTMLElement} 主元素
         * @protected
         */
        Form.prototype.createMain = function (options) {
            var form = document.createElement('form');
            form.method = 'POST';
            form.action = options.action;
            return form;
        };

        /**
         * 初始化参数
         *
         * @param {Object} options 构造函数传入的参数
         * @protected
         */
        Form.prototype.initOptions = function (options) {
            var properties = {};
            require('./lib').extend(properties, options);
            properties.tagName = 'form';
            Panel.prototype.initOptions.call(this, properties);
            this.action = this.main.getAttribute('action');
        };

        var InputControl = require('./InputControl');

        function collect(control, store) {
            if (control instanceof InputControl) {
                var name = control.get('name');
                var value = control.getRawValue();
                if (store.hasOwnProperty(name)) {
                    store[name] = [].concat(store[name], value);
                }
                else {
                    store[control.name] = value;
                }
            }
            for (var i = 0; i < control.children.length; i++) {
                collect(control.children[i], store);
            }
        }

        /**
         * 获取表单数据，形成以`name`为键，`rawValue`为值的对象，
         * 如果有同`name`的多个控件，则值为数组
         *
         * @param {Object} 表单的数据
         * @public
         */
        Form.prototype.getData = function () {
            var store = {};
            collect(this, store);
            return store;
        };

        require('./lib').inherits(Form, Panel);
        require('./main').register(Form);
        return Form;
    }
);