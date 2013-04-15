define(
    function (require) {
        var Extension = require('../Extension');

        /**
         * 从DOM元素中抓取命令事件的扩展
         *
         * @param {Object=} options 初始化配置
         * @constructor
         */
        function Command(options) {
            options = options || {};
            if (!options.events) {
                options.events = ['click'];
            }
            else if (typeof options.events === 'string') {
                options.events = options.events.split(',');
                var lib = require('../lib');
                for (var i = 0; i < options.events.length; i++) {
                    options.events[i] = lib.trim(options.events[i]);
                }
            }
            Extension.apply(this, arguments);
        }

        Command.prototype.type = 'Command';

        /**
         * 处理事件
         *
         * @param {Event} e 事件对象
         */
        function handleCommand( element ) {
            return  function(e){
                var e = e || window.event;
                var cur = e.target || e.srcElement;
                while(true){
                    if ( cur.nodeType === 1 && ( cur.disabled !== true || e.type !== "click" ) ) {
                        var commandName = cur.getAttribute( 'data-command' );
                        if( commandName ){
                            var args = cur.getAttribute( 'data-command-args' );
                            this.fire(
                                'command', 
                                { name: commandName, triggerType: e.type, args: args, element: cur, e : e }
                            );
                        }
                    }

                    if( cur == element ){
                        break;
                    }
                    cur = cur.parentNode || element ;   
                }
            };
        }

        /**
         * 激活扩展
         *
         * @public
         */
        Command.prototype.activate = function () {
            this.handler = handleCommand( this.target.main );

            var helper = require('../controlHelper');
            for (var i = 0; i < this.events.length; i++) {
                helper.addDOMEvent(
                    this.target, 
                    this.target.main, 
                    this.events[i], 
                    this.handler
                );
            }

            Extension.prototype.activate.apply(this, arguments);
        };

        /**
         * 取消扩展的激活状态
         *
         * @public
         */
        Command.prototype.inactivate = function () {
            var helper = require('../controlHelper');
            for (var i = 0; i < this.events.length; i++) {
                helper.removeDOMEvent(
                    this.target, 
                    this.target.main, 
                    this.events[i], 
                    this.handler
                );
            }
            this.handler = null;

            Extension.prototype.inactivate.apply(this, arguments);
        };

        /**
         * 创建一个根据事件类型和命令名称分发至对应处理函数的函数
         *
         * @param {Object} config 相关的配置
         * @param {function} 分发函数，用于注册到`command`事件上
         */
        Command.createDispatcher = function (config) {
            // `config`可以是以下两种形式：
            // 
            //     [
            //         { type: 'click', name: 'xxx', handler: xxx },
            //         { type: 'mouseover', name: 'xxx', handler: yyy },
            //         { type: 'click', name: 'yyy', handler: zzz },
            //     ]
            // 
            // 或
            // 
            //     {
            //         'click:xxx': xxx,
            //         'mouseover:xxx': yyy,
            //         'click:yyy': zzz
            //     }
            var map = config;
            var lib = require('../lib');
            if (lib.isArray(config)) {
                map = {};
                for (var i = 0; i < config.length; i++) {
                    var item = config[i];
                    var name = item.type
                        ? item.type + ':' + item.name
                        : item.name;
                    map[name] = item.handler;
                }
            }

            return function (e) {
                var lib = require('../lib');
                
                // 处理函数的查找规则，优先级从高到低依次是：
                // 
                // 1. 从`config`中传过来的且能对上类型及命令名称的
                // 2. 从`config`中传过来的且能对上命令名称的
                // 3. 控件实例上以`execute${name}${triggerType}`为名称的方法
                // 4. 控件实例上以`execute${name}`为名称的方法
                // 5. `config`中命令名称为`*`且类型能对上的
                // 6. `config`中命令名称为`*`且没提供类型的
                // 
                // 其中3和4两条中的`${name}`和`${triggerType}`均转为PascalCase
                var handler = map[e.triggerType + ':' + e.name];
                if (!handler) {
                    handler = map[e.name];
                }
                if (!handler) {
                    var method = 'execute' 
                        + lib.pascalize(e.name)
                        + lib.pascalize(e.triggerType);
                    handler = this[method];
                }
                if (typeof handler !== 'function') {
                    var method = 'execute' 
                        + lib.pascalize(e.name);
                    handler = this[method];
                }
                if (typeof handler !== 'function') {
                    handler = map[e.triggerType + ':*'];
                }
                if (!handler) {
                    handler = map['*'];
                }

                if (typeof handler === 'function') {
                    handler.apply(this, arguments);
                }
            };
        };

        require('../lib').inherits(Command, Extension);
        require('../main').registerExtension(Command);

        return Command;
    }
);