/**
 * ESUI (Enterprise Simple UI)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file 弹出框
 * @author dbear
 */

define(
    function (require) {
        require('./Button');
        require('./Panel');
        // css
        require('css!./css/Button.css');
        require('css!./css/Dialog.css');

        var lib = require('./lib');
        var helper = require('./controlHelper');
        var Control = require('./Control');

        var maskIdPrefix = 'ctrlMask';

        /**
         * 弹出框控件类
         * 
         * @constructor
         * @param {Object} options 初始化参数
         */
        function Dialog(options) {
            Control.apply(this, arguments);
        }

        /**
         * 渲染控件前重绘控件
         * 
         */
        function parseMain(options) {
            var main = options.main;
            // 如果main未定义，则不作解析
            if (!main) {
                return;
            }
            var els = main.getElementsByTagName('*');
            var len = els.length;
            var roleName;
            var content;
            var roles = {};

            while (len--) {
                roleName = els[len].getAttribute('data-role');
                if (roleName) {
                    content = els[len].innerHTML;
                    // 不再校验，如果设置了相同的data-role，
                    // 直接覆盖
                    roles[roleName] = content;
                }
            }

            options.title = roles.title || options.title;
            options.content = roles.content || options.content;

            if (options.needFoot === true) {
                if (roles.foot) {
                    options.foot = roles.foot;
                }
            }
            else if (options.needFoot === false) {
                options.foot = null;
            }

        }


        /**
         * 构建对话框标题栏
         * 
         * @inner
         */
        function getHeadHtml(control) {
            var me = control;
            var head = 'head';
            var title = 'title';
            var close = 'close-icon';

            var closeTpl = 
                '<div class="${clsClass}" id="${clsId}">&nbsp;</div>';
            var closeIcon = '';

            if (me.closeButton) {
                closeIcon = lib.format(
                    closeTpl,
                    {
                        'clsId': helper.getId(me, close),
                        'clsClass': helper.getPartClasses(me, close).join(' ')
                    }
                );
            }

            var headTpl = ''
                + '<div id="${headId}" class="${headClass}">'
                +   '<div id="${titleId}" class="${titleClass}">'
                +   '${title}'
                +   '</div>'
                +   '${closeIcon}'
                + '</div>';

            var headClasses = [].concat(
                helper.getPartClasses(me, head)
            );

            var headData = {
                'headId':  helper.getId(me, head),
                'headClass':  headClasses.join(' '),
                'titleId':  helper.getId(me, title),
                'titleClass':  helper.getPartClasses(me, title).join(' '),
                'title': me.title,
                'closeIcon': closeIcon
            };

            var headHtml = lib.format(headTpl, headData);

            var headPanelHtml = ''
                + '<div data-ui="type:Panel;childName:head">'
                + headHtml
                + '</div>';

            return headPanelHtml;

        }

        /**
         * 构建对话框主内容和底部内容
         *
         * @param {string} type foot | body 
         * @inner
         */
        function getBFHtml(control, type) {
            var tpl = ''
                + '<div class="${panelClass}" '
                + 'data-ui="type:Panel;childName:${childName}">'
                + '</div>';

            var data = {
                'panelClass':
                    helper.getPartClasses(control, type + '-panel').join(' '),
                'childName': type
            };

            return lib.format(tpl, data);

        }

        /**
         * 点击头部关闭按钮时事件处理函数
         *
         * @inner
         */
        function closeClickHandler() {
            if (this.closeOnHide === true) {
                this.dispose();
            }
            else {
                this.hide();
            }
            this.fire('close');

        }

        /**
         * 页面resize时事件的处理函数
         *
         * @param {ui.Dialog} 控件对象
         * @inner
         */
        function resizeHandler(control) {
            var me = control;
            var page = lib.page;
            var main = me.main;
            var left = me.left;
            var top = me.top;
            if (!left) {
                left = (page.getViewWidth() - main.offsetWidth) / 2;
            }

            if (left < 0) {
                left = 0;
            }


            if (!top) {
                top = 100;
            }

            main.style.left = left + 'px';
            main.style.top = page.getScrollTop() + top + 'px';
        }

        var getDialogHeadDownHandler; //drag mousedown的句柄
        var getDialogHeadMoveHandler; //drag mousemove的句柄
        var getDialogHeadUpHandler; //drag mouseup的句柄

        /**
         * 绑定拖动drag事件
         * @param {ui.Dialog} 控件对象
         * @param {boolean} unbind 是否移除事件
         */
        function initDragHandler(dialog, unbind) {
            var me = dialog;
            var head = lib.g(helper.getId(me, 'head'));
            
            getDialogHeadDownHandler = lib.bind(dialogHeadDownHandler, me);

            if (unbind === true) {
                lib.un(head, 'mousedown', getDialogHeadDownHandler);
            }
            else {
                lib.on(head, 'mousedown', getDialogHeadDownHandler);
            }
        }

        /**
         * drag时 mousedown的事件处理函数
         */
        function dialogHeadDownHandler(e) {
            var me = this;
            var button = e.button;
            var head = lib.g(helper.getId(me, 'head'));
            // 只有左键点击时才触发
            var isLeft = false;
            if ((!e.which && button === 1) || e.which === 1) {
                isLeft = true;
            }
            if (!isLeft) {
                lib.un(head, 'mouseup', getDialogHeadUpHandler);
                return;
            }
            var doc = document;

            getDialogHeadMoveHandler = lib.bind(dialogHeadMoveHandler, me);
            getDialogHeadUpHandler = lib.bind(dialogHeadUpHandler, me);

            lib.on(doc, 'mousemove', getDialogHeadMoveHandler);
            lib.on(doc, 'mouseup', getDialogHeadUpHandler);

            //记录鼠标位置
            lib.event.getMousePosition(e);
            me.dragStartPos = {x: e.pageX, y: e.pageY};
        }

        /**
         * drag时 mousemove的事件处理函数
         */
        function dialogHeadMoveHandler(e) {
            var me = this;

            //记录鼠标位置
            lib.event.getMousePosition(e);

            //计算移动距离
            var movedDistance = {
                x: e.pageX - me.dragStartPos.x,
                y: e.pageY - me.dragStartPos.y
            };

            me.dragStartPos = {x: e.pageX, y: e.pageY};

            var main = me.main;
            var mainPos = lib.getOffset(main);

            var curMainLeft = mainPos.left + movedDistance.x;
            var curMainTop = mainPos.top + movedDistance.y;

            var pageWidth = lib.page.getWidth();
            var pageHeight = lib.page.getHeight();

            var offset = lib.getOffset(main);

            // 判断边缘是否已经超出屏幕
            // 1. 上边缘超出
            if (curMainTop < 0) {
                curMainTop = 0;
            }
            // 2. 下边缘超出
            else if (curMainTop > pageHeight - offset.height) {
                curMainTop = pageHeight - offset.height;
            }


            // 3. 左边缘超出
            if (curMainLeft < 0) {
                curMainLeft = 0;
            }
            // 4. 右边缘超出
            else if (curMainLeft > pageWidth - offset.width) {
                curMainLeft = pageWidth - offset.width;
            }


            main.style.left = curMainLeft + 'px';
            main.style.top = curMainTop + 'px';

        }

        /**
         * drag时 mouseup的事件处理函数
         */
        function dialogHeadUpHandler(e) {
            //卸载事件
            lib.un(document, 'mousemove', getDialogHeadMoveHandler);
            var head = lib.g(helper.getId(this, 'head'));
            lib.un(head, 'mouseup', getDialogHeadUpHandler);
        }


        /**
         * 显示遮盖层
         * @param {ui.Dialog} dialog 控件对象
         */
        function showMask(dialog) {
            var mask = getMask(dialog);
            var clazz = [];
            var maskClass = helper.getPartClasses(dialog, 'mask').join(' ');

            clazz.push(maskClass);
            repaintMask(mask);

            mask.className = clazz.join(' ');
            mask.style.display = 'block';
            dialog.curMaskListener = lib.curry(maskResizeHandler, dialog);
            lib.on(window, 'resize', dialog.curMaskListener);            
        }


        /**
         * 隐藏遮盖层
         * @param {ui.Dialog} dialog 控件对象
         */
        function hideMask(dialog) {
            var mask = getMask(dialog);
            if ('undefined' != typeof mask) {
                lib.removeNode(mask);
                lib.un(window, 'resize', dialog.curMaskListener); 
                dialog.curMaskListener = null;
            }
        }

        /**
         * 页面大小发生变化的事件处理器
         *
         * @param {ui.Dialog} 控件对象
         * @inner
         */
        function maskResizeHandler(control) {
            repaintMask(getMask(control));
        }

        /**
         * 遮盖层初始化
         * 
         * @param {string} maskId 遮盖层domId
         * @inner
         */
        function initMask(maskId) {
            var el = document.createElement('div');
            el.id = maskId;
            document.body.appendChild(el);
        }


        /**
         * 重新绘制遮盖层的位置
         *
         * @inner
         * @param {HTMLElement} mask 遮盖层元素.
         */
        function repaintMask(mask) {
            var width = Math.max(
                            document.documentElement.clientWidth,
                            Math.max(
                                document.body.scrollWidth,
                                document.documentElement.scrollWidth)),
                height = document.documentElement.clientHeight;

            mask.style.width = width + 'px';
            mask.style.height = height + 'px';
        }

        /**
         * 获取遮盖层dom元素
         *
         * @param {ui.Dialog} 控件对象
         * @inner
         * @return {HTMLElement} 获取到的Mask元素节点.
         */
        function getMask(control) {
            var dialogId = helper.getId(control);
            var id = maskIdPrefix + '-' + dialogId;
            var mask = lib.g(id);

            if (!mask) {
                initMask(id);
            }

            return lib.g(id);
        }


        Dialog.OK_TEXT = '确定';
        Dialog.CANCEL_TEXT = '取消';

        Dialog.prototype = {
            /**
             * 控件类型
             * 
             * @type {string}
             */
            type: 'Dialog',

            /**
             * 初始化参数
             *
             * @param {Object=} options 构造函数传入的参数
             * @override
             * @protected
             */
            initOptions: function (options) {
                //由main解析
                parseMain(options);
                /**
                 * 默认Dialog选项配置
                 */
                var properties = {
                    autoPosition: false,  // 是否自动定位居中
                    closeButton: true,    // 是否具有关闭按钮
                    closeOnHide: true, // 右上角关闭按钮是隐藏还是移除
                    draggable: false,     // 是否可拖拽
                    mask: true,           // 是否具有遮挡层
                    width: 600,           // 对话框的宽度
                    top: 100,             // 对话框的垂直位置
                    left: 0,              // 对话框的水平位置
                    title: '我是标题',    // 标题的显示文字
                    content: '<p>我是内容</p>',   // 内容区域的显示内容
                    foot: ''
                        + '<div data-ui="type:Button;id:btnFootOk;'
                        + 'childName:btnOk;'
                        + 'skin:spring;height:26;width:50;">确定</div>'
                        + '<div data-ui="type:Button;'
                        + 'id:btnFootCancel;childName:btnCancel;'
                        + 'height:26;">取消</div>',
                    needFoot: true
                };
                lib.extend(properties, options);
                this.setProperties(properties);
            },

            /**
             * 初始化DOM结构，仅在第一次渲染时调用
             */
            initStructure: function () {
                var ui = require('./main');
                var main = this.main;
                // 判断main是否在body下，如果不在，要移到body下
                if (main.parentNode.nodeName.toLowerCase() !== 'body') {
                    main.setAttribute(
                        ui.getConfig('instanceAttr'),
                        helper.getGUID()
                    );
                    var newMain = this.createMain();
                    document.body.appendChild(newMain);
                    main.parentNode.removeChild(main);
                    this.main = newMain;
                }

                // 设置样式
                this.main.style.left = '-10000px';
                this.main.innerHTML = ''
                    + getHeadHtml(this)
                    + getBFHtml(this, 'body')
                    + getBFHtml(this, 'foot');
                this.initChildren(this.main);

                // 初始化控件主元素上的行为
                if (this.closeButton !== false) {
                    var close = lib.g(helper.getId(this, 'close-icon'));
                    helper.addDOMEvent(
                        this,
                        close,
                        'click',
                        lib.curry(closeClickHandler, this));
                }
            },

            /**
             * 重新渲染视图
             * 仅当生命周期处于RENDER时，该方法才重新渲染
             *
             * @param {Array=} 变更过的属性的集合
             * @override
             */
            repaint: helper.createRepaint(
                Control.prototype.repaint,
                {
                    name: 'height',
                    paint: function (dialog, value) {
                        if (value) {
                            dialog.main.style.height = value + 'px';
                        }
                        if (dialog.isShow) {
                            resizeHandler(dialog);
                        }
                    }
                },
                {
                    name: 'width',
                    paint: function (dialog, value) {
                        if (value) {
                            dialog.main.style.width = value + 'px';
                        }
                        if (dialog.isShow) {
                            resizeHandler(dialog);
                        }
                    }
                },
                {
                    name: 'title',
                    paint: function (dialog, value) {
                        var titleId = helper.getId(dialog, 'title');
                        lib.g(titleId).innerHTML = value;
                    }
                },
                {
                    name: 'content',
                    paint: function (dialog, value) {
                        var bfTpl = ''
                            + '<div class="${class}" id="${id}">'
                            + '${content}'
                            + '</div>';
                        // 获取body panel
                        var body = dialog.getBody();
                        var bodyId = helper.getId(dialog, 'body');
                        var bodyClass = helper.getPartClasses(dialog, 'body');
                        var data = {
                            'class': bodyClass.join(' '),
                            'id': bodyId,
                            'content': value 
                        };
                        body.setContent(
                            lib.format(bfTpl, data)
                        );
                    }
                },
                {
                    name: 'foot',
                    paint: function (dialog, value) { 
                        var bfTpl = ''
                            + '<div class="${class}" id="${id}">'
                            + '${content}'
                            + '</div>';
                        var footId = helper.getId(dialog, 'foot');
                        var footClass = helper.getPartClasses(dialog, 'foot');
                        // 取消了foot
                        if (value == null) {
                            dialog.needFoot = false;
                            var foot = dialog.getFoot();
                            dialog.removeChild(foot);
                        }
                        else {
                            dialog.needFoot = true;
                            var foot = dialog.getFoot();
                            var data = {
                                'class': footClass.join(' '),
                                'id': footId,
                                'content': value 
                            };
                            foot.setContent(
                                lib.format(bfTpl, data)
                            );
                        }
                    }
                },
                {
                    name: 'draggable',
                    paint: function (dialog, draggable) {
                        var unbind = false;
                        if (draggable) {
                            dialog.addState('draggable');
                        }
                        else {
                            dialog.removeState('draggable');
                            unbind = true;
                        }
                        initDragHandler(dialog, unbind);
                    }
                }
            ),

            /**
             * 获取对话框主体的控件对象
             * 
             * 
             * @return {ui.Panel} 
             */
            getBody: function () {
                return this.getChild('body');
            },


            /**
             * 获取对话框头部的控件对象
             * 
             * 
             * @return {ui.Panel} 
             */
            getHead: function () {
                return this.getChild('head');
            },


            /**
             * 获取对话框腿部的控件对象
             * 
             * 
             * @return {ui.Panel} 
             */
            getFoot: function () {
                return this.getChild('foot');
            },


            /**
             * 显示对话框
             * 
             */
            show: function () {
                var mask = this.mask;
                if (helper.isInStage(this, 'INITED')) {
                    this.render();
                }

                // 浮动层自动定位功能初始化
                if (this.autoPosition) {
                    lib.on(window, 'resize', resizeHandler);
                }
                this.setWidth(this.width);
                resizeHandler(this);

                if (mask) {
                    showMask(this);
                }

                this.fire('show');
                this.isShow = true;

            },

            /**
             * 隐藏对话框
             * 
             */
            hide: function () {
                if (this.isShow) {
                    if (this.autoPosition) {
                        lib.un(window, 'resize', resizeHandler);
                    }
                    var main = this.main;
                    var mask = this.mask;

                    main.style.left = main.style.top = '-10000px';

                    if (mask) {
                        hideMask(this);
                    }
                }

                this.fire('hide');
                this.isShow = false;
            },


            /**
             * 设置标题文字
             * 
             * @param {string} html 要设置的文字，支持html
             */
            setTitle: function (html) {
                this.setProperties({'title': html});
            },

            /**
             * 设置内容
             *
             * @param {string} content 要设置的内容，支持html.
             */
            setContent: function (content) {
                this.setProperties({'content': content});
            },

            /**
             * 设置腿部内容
             *
             * @param {string} foot 要设置的内容，支持html.
             */
            setFoot: function (foot) {
                this.setProperties({'foot': foot});
            },

            /**
             * 设置对话框的高度，单位为px
             *
             * @param {number} height 对话框的高度.
             */
            setHeight: function (height) {
                this.setProperties({'height': height});
            },

            /**
             * 设置对话框的宽度，单位为px
             *
             * @param {number} width 对话框的宽度.
             */
            setWidth: function (width) {
                this.setProperties({'width': width});
            },


            /**
             * 销毁控件
             */
            dispose: function () {
                if (helper.isInStage(this, 'DISPOSED')) {
                    return;
                }
                this.hide();
                //移除dom
                var domId = helper.getId(this);
                lib.removeNode(domId);
                Control.prototype.dispose.apply(this, arguments);
            }

        };


        /**
         * 确认提示框
         *
         */
        Dialog.confirm = function (args) {
            var dialogPrefix    = 'dialog-confirm';
            var ui = require('./main');

            /**
             * 获取按钮点击的处理函数
             * 
             * @private
             * @param {ui.Dialog} 控件对象
             * @param {string} 事件类型
             */
            function btnClickHandler(dialog, type) {
                // 有可能在参数里设置了处理函数
                var handler;
                if (type === 'ok') {
                    handler = dialog.onok;
                }
                else {
                    handler = dialog.oncancel;
                }
                var isFunc = (typeof handler == 'function');
                if (isFunc) {
                    handler(dialog);
                }
                dialog.fire(type);
                dialog.dispose();
            }

            var title = lib.encodeHTML(args.title) || '';
            var content = lib.encodeHTML(args.content) || '';

            var properties = {
                type: 'confirm',
                width: 300,
                skin: 'confirm',
                title: ''
            };

            lib.extend(properties, args);

            var tpl = [
                '<div class="ui-dialog-icon ui-dialog-icon-${type}"></div>',
                '<div class="ui-dialog-text">${content}</div>'
            ].join('');


            //创建main
            var main = document.createElement('div');
            document.body.appendChild(main);

            properties.id = helper.getGUID(dialogPrefix);
            properties.closeButton = false;
            properties.mask = true;
            properties.main = main;

            var type = properties.type;
            properties.type = null;

            var dialog = ui.create('Dialog', properties);

            dialog.setTitle(title);
            dialog.setContent(
                lib.format(tpl, { type: type, content: content })
            );
            dialog.show();
            //使用默认foot，改变显示文字
            var okBtn = dialog.getFoot().getChild('btnOk');
            var cancelBtn = dialog.getFoot().getChild('btnCancel');
            okBtn.setContent(Dialog.OK_TEXT);
            cancelBtn.setContent(Dialog.CANCEL_TEXT);
            okBtn.on(
                'click',
                lib.curry(btnClickHandler, dialog, 'ok')
            );
            cancelBtn.on(
                'click',
                lib.curry(btnClickHandler, dialog, 'cancel')
            );

            return dialog;

        };


        Dialog.alert = function (args) {
            var dialogPrefix = 'dialog-alert';
            var okPrefix = 'dialog-alert-ok';

            var ui = require('./main');

            /**
             * 获取按钮点击的处理函数
             * 
             * @private
             * @param {ui.Dialog} 控件对象
             * @param {string} 事件类型
             */
            function btnClickHandler(dialog, okBtn) {
                // 有可能在参数里设置了处理函数
                var handler = dialog.onok;
                var isFunc = (typeof handler == 'function');
                if (isFunc) {
                    handler(dialog);
                }
                dialog.fire('ok');
                okBtn.dispose();
                dialog.dispose();
            }

            var title = lib.encodeHTML(args.title) || '';
            var content = lib.encodeHTML(args.content) || '';

            var properties = {
                type: 'warning',
                width: 300,
                skin: 'alert',
                title: ''
            };

            lib.extend(properties, args);

            var tpl = [
                '<div class="ui-dialog-icon ui-dialog-icon-${type}"></div>',
                '<div class="ui-dialog-text">${content}</div>'
            ].join('');

            //创建main
            var main = document.createElement('div');
            document.body.appendChild(main);

            var dialogId = helper.getGUID(dialogPrefix);
            properties.id = dialogId;
            properties.closeButton = false;
            properties.mask = true;
            properties.main = main;

            var type = properties.type;
            properties.type = null;

            var dialog = ui.create('Dialog', properties);
            dialog.setTitle(title);
            dialog.setContent(
                lib.format(tpl, { type: type, content: content })
            );

            dialog.setFoot(''
                + '<div data-ui="type:Button;childName:okBtn;id:' 
                + dialogId + '-' + okPrefix + '; skin:spring;width:50;">'
                + Dialog.OK_TEXT
                + '</div>'
            );
            
            dialog.show();
            var okBtn = dialog.getFoot().getChild('okBtn');
            okBtn.on(
                'click',
                lib.curry(btnClickHandler, dialog, okBtn)
            );
            return dialog;
        }; 

        require('./lib').inherits(Dialog, Control);
        require('./main').register(Dialog);

        return Dialog;
    }
);
