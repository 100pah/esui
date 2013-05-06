/**
 * ESUI (Enterprise Simple UI)
 * Copyright 2013 Baidu Inc. All rights reserved.
 * 
 * @file 表格控件
 * @author wurongyao
 */
define(
    function (require) {
        var lib = require('./lib');
        var helper = require('./controlHelper');
        var Control = require('./Control');
        var main = require('./main');

        /**
         * 表格控件类
         * 
         * @constructor
         * @param {Object} options 初始化参数
         */
        function Table(options) {
            /**
             * 默认Table选项配置
             * 
             * @const
             * @inner
             * @type {Object}
             */
            var DEFAULT_OPTION = {
                noDataHtml : 'text',
                followHead : false,
                sortable : false,
                columnResizable : false,
                rowWidthOffset : -1,
                subrowMutex : 1,
                subEntryOpenTip : '点击展开',
                subEntryCloseTip : '点击收起',
                subEntryWidth : 18,
                breakLine : false,
                followHeightArr : [0, 0],
                followWidthArr : [] 
            };

            Control.call(this, lib.extend(DEFAULT_OPTION, options));
        }

         /**
         * 获取dom子部件的id
         * 
         * @protected
         * @return {string}
         */
        function getId(table, name){
            return helper.getId(table, name);
        }

        /**
         * 获取dom子部件的css class
         * 
         * @protected
         * @return {string}
         */
        function getClass(table, name) {
            return helper.getPartClasses(table, name).join(' ');
        }

        /**
         * 获取列表头容器元素
         * 
         * @public
         * @return {HTMLElement}
         */
        function getHead(table) {
            return lib.g(getId(table, 'head'));
        }

        /**
         * 获取列表体容器素
         * 
         * @public
         * @return {HTMLElement}
         */
        function getBody(table) {
            return lib.g(getId(table, 'body'));
        }


        /**
         * 获取列表尾容器元素
         * 
         * @public
         * @return {HTMLElement}
         */
        function getFoot(table) {
            return lib.g(getId(table, 'foot'));
        }

        /**
         * 获取表格内容行的dom元素
         * 
         * @private
         * @param {number} index 行号
         * @return {HTMLElement}
         */
        function getRow(table, index) {
            return lib.g(getId(table, 'row') + index);
        }
            
        /**
         * 获取checkbox选择列表格头部的checkbox表单
         * 
         * @private
         * @return {HTMLElement}
         */
        function getHeadCheckbox(table) {
            return lib.g(getId(table, 'selectAll'));
        }
        
        /**
         * 获取表格所在区域宽度
         * 
         * @private
         * @return {number}
         */
        function getWidth(table) {  
            // 如果手工设置宽度，不动态计算
            if (table.width) {
                return table.width;
            }  
            
            var rulerDiv = document.createElement('div');
            var parent = table.main.parentNode;
            
            parent.appendChild(rulerDiv);    
            var width = rulerDiv.offsetWidth;
            parent.removeChild(rulerDiv);
            
            return width;
        }
        /**
         * 初始化表格的字段
         * 
         * @private
         */
        function initFields(table) {
            if (!table.fields) {
                return;
            }
            
            // 避免刷新时重新注入
            var fields = table.fields;
            var realFields = fields.slice(0);
            var len = realFields.length;

            while (len--) {
                if (!realFields[len]) {
                    realFields.splice(len, 1);
                }
            }
            table.realFields = realFields;
            if (!table.select){
                return;
            }
            switch (table.select.toLowerCase()) {
                case 'multi':
                    realFields.unshift(getMultiSelectTpl(table));
                    break;
                case 'single':
                    realFields.unshift(getSingleSelectTpl(table));
                    break;
            }
        }

        /**
         * dom表格起始的html模板
         * 
         * @private
         */
        var tplTablePrefix = '<table cellpadding="0" cellspacing="0" width="${width}" controlTable="${controlTableId}">';
          
         /**
         * 缓存控件的核心数据
         *
         * @private
         */
        function caching(table) {
            if (table.followHead) {
                cachingFollowHead(table);
            }
        }
        
        /**
         * 缓存表头跟随所用的数据
         *
         * @private
         */
        function cachingFollowHead(table) {
            var followDoms = table.followDoms;

            if (!followDoms) {
                followDoms = [];
                table.followDoms = followDoms;

                var walker = table.main.parentNode.firstChild;
                var followWidths = table.followWidthArr;
                var followHeights = table.followHeightArr;

                // 缓存表格跟随的dom元素
                while (walker) {
                    if (walker.nodeType == 1 
                        && walker.getAttribute('followThead')){
                        followDoms.push(walker);
                    }
                    walker = walker.nextSibling;
                }

                function getStyleNum(dom, styleName) {
                    var result = lib.getComputedStyle(dom, styleName);
                    return (result == '' ? 0 : +(result.replace('px','')));
                }

                // 读取height和width的值缓存
                followHeights[0] = 0;
                for (var i = 0, len = followDoms.length; i < len; i++) {
                    var dom = followDoms[i];
                    followWidths[ i ] = getStyleNum(dom, 'padding-left') 
                                      + getStyleNum(dom, 'padding-right')  
                                      + getStyleNum(dom, 'border-left') 
                                      + getStyleNum(dom, 'border-right'); 
                    followHeights[i + 1] = followHeights[i] + dom.offsetHeight;
                }
                followHeights[i + 1] = followHeights[i];
                followHeights.lenght = i + 2;
            }

            // 读取跟随的高度，缓存
            var followOffest = lib.getOffset(followDoms[0] || table.main);
            table.followTop = followOffest.top;
            table.followLeft = followOffest.left;
        }


        /**
         * 初始化列
         *
         * @private
         */
        function initCols(table) {
           initFields(table);
           initMinColsWidth(table);
           initColsWidth(table);
        }

        /**
         * 初始最小列宽
         *
         * @private
         */
        function initMinColsWidth(table) {
            var fields = table.realFields;
            var result = [];

            if (!table.noHead) {
                for (var i = 0, len = fields.length; i < len; i++) {
                    var field = fields[ i ];
                    var width = field.minWidth;
                    if (!width && !field.breakLine) {
                        // 30包括排序和外层padding
                        width = field.title.length * 13 + 30;
                    }

                    result[i] = width;
                }
            } else {
                for (var i = 0, len = fields.length; i < len; i++) {
                    result[i] = 50;
                }
            }

            table.minColsWidth = result;
        }

        /**
         * 初始化列宽
         * 
         * @private
         */
        function initColsWidth(table) {
            var fields = table.realFields;
            var canExpand = [];
            
            table.colsWidth = [];
            
            // 减去边框的宽度
            var leftWidth = table.realWidth - 1;
            
            var maxCanExpandIdx = len;

            // 读取列宽并保存
            for(var i = 0, len = fields.length; i < len; i++) {
                var field = fields[ i ];
                var width = field.width;
                
                width = (width ? parseInt(width, 10) : 0);
                table.colsWidth.push(width);
                leftWidth -= width;

                if (!field.stable) {
                    canExpand.push(i);
                }
            }
            
            // 根据当前容器的宽度，计算可拉伸的每列宽度
            var len = canExpand.length;                 
            var leaveAverage = Math.round(leftWidth / len);
            
            for(var i = 0, len = fields.length; i < len ;i++) {
                var index  = canExpand[i];
                var offset = Math.abs(leftWidth) < Math.abs(leaveAverage) ? leftWidth : leaveAverage; 

                leftWidth -= offset;
                table.colsWidth[index] += offset;

                //计算最小宽度
                var minWidth = table.minColsWidth[index];
                if (minWidth > table.colsWidth[index]) {
                    leftWidth += table.colsWidth[index] - minWidth;
                    table.colsWidth[index] = minWidth;
                }
            }
            
            if (leftWidth < 0) {// 如果空间不够分配，需要重新从富裕的列调配空间
                var i = 0;
                var len = fields.length;
                while (i < len && leftWidth != 0) {
                    var index = canExpand[i];
                    var minWidth = table.minColsWidth[index];

                    if (minWidth < table.colsWidth[index]) {
                        offset = table.colsWidth[canExpand[i]] - minWidth;
                        offset = offset > Math.abs(leftWidth) ? leftWidth : -offset;
                        leftWidth += Math.abs(offset);
                        table.colsWidth[index] += offset;
                    }
                    i++;
                }
            } else if (leftWidth > 0) {// 如果空间富裕，则分配给第一个可调整的列
                table.colsWidth[canExpand[0]] += leftWidth;
            }
        }
        
        /**
         * 绘制表格尾
         * 
         * @private
         */
        function renderFoot(table) {
            var foot = getFoot(table);

            if (!(table.foot instanceof Array)) {
                foot && (foot.style.display = 'none');
            } else {
                if (!foot) {
                    var type = 'foot';
                    var id = getId(table, type);
                    foot = document.createElement('div');
                    foot.id = id;
                    foot.className = getClass(table, type);
                    foot.setAttribute('controlTable', table.id);
                    
                    table.main.appendChild(foot);
                }

                foot.style.display = '';
                foot.style.width = table.realWidth + 'px';
                foot.innerHTML = getFootHtml(table);
            }
        }
        
        /**
         * 获取表格尾的html
         * 
         * @private
         * @return {string}
         */
        function getFootHtml(table) {
            var html = [];
            var footArray = table.foot;
            var fieldIndex = 0;
            var colsWidth = table.colsWidth;
            var thCellClass = getClass(table, 'fcell');
            var thTextClass = getClass(table, 'fcell-text');
            
            html.push(lib.format(tplTablePrefix, { width: '100%', controlTableId : table.id }));

            for (var i = 0, len = footArray.length; i < len; i++) {
                var footInfo = footArray[i];
                var colWidth = colsWidth[fieldIndex];
                var colspan = footInfo.colspan || 1;
                var thClass = [thCellClass];
                var contentHtml = footInfo.content;

                if ('function' == typeof contentHtml) {
                    contentHtml = contentHtml.call(table);
                }
                contentHtml = contentHtml || '&nbsp;';

                for (var j = 1; j < colspan; j++) {
                    colWidth += colsWidth[fieldIndex + j];
                }
                
                fieldIndex += colspan;
                if (footInfo.align) {
                    thClass.push(getClass(table, 'cell-align-' + footInfo.align));
                }
                
                colWidth += table.rowWidthOffset; 
                (colWidth < 0) && (colWidth = 0);
                html.push(  '<th id="' + getFootCellId(table, i) + '" class="' + thClass.join(' ') + '"',
                            ' style="width:' + colWidth + 'px;',
                            (colWidth ? '' : 'display:none;') + '">',
                            '<div class="' + thTextClass + '">',
                            contentHtml,
                            '</div></th>');
            }

            html.push('</tr></table>');
            return html.join('');
        }

        /**
         * 绘制表格头
         * 
         * @private
         */
        function renderHead(table) {
            var type = 'head';
            var id = getId(table, type);
            var head = getHead(table);
            var multiSelect = table.select && table.select.toLowerCase() == 'multi' ;

            if (!head) {
                head = document.createElement('div');
                head.id = id;
                head.className = getClass(table, type);
                head.setAttribute('controlTable', table.id);
                table.main.appendChild(head);

                helper.addDOMEvent(table, head, 'mousemove', lib.bind(headMoveHandler, head, table));
                helper.addDOMEvent(table, head, 'mousedown', lib.bind(dragStartHandler, head, table));

            }

            if (table.noHead) {
                head.style.display = 'none'
                return;
            }

            head.style.display = '';
            head.style.width = table.realWidth + 'px';
            head.innerHTML = getHeadHtml(table);
        }
        
        /**
         * 获取表格头的html
         * 
         * @private
         * @return {string}
         */
        function getHeadHtml(table) {
            var fields = table.realFields;
            var thCellClass = getClass(table, 'hcell');
            var thTextClass = getClass(table, 'hcell-text');
            var breakClass = getClass(table, 'cell-break');
            var sortClass = getClass(table, 'hsort');
            var selClass = getClass(table, 'hcell-sel');
            var tipClass = getClass(table, 'hhelp');
            var tipHtml;
            var len = fields.length;
            var canDragBegin = -1;
            var canDragEnd = -1;

            if(!table.disabled){
                // 计算最开始可拖拽的单元格
                for (var i = 0; i < len; i++) {
                    if (!fields[i].stable) {
                        canDragBegin = i;
                        break;
                    }
                }
                
                // 计算最后可拖拽的单元格
                for (var i = len - 1; i >= 0; i--) {
                    if (!fields[ i ].stable) {
                        canDragEnd = i;
                        break;
                    }
                }
            }

            var html = [];
            // 拼装html
            html.push(lib.format(tplTablePrefix, { width : '100%' , controlTableId : table.id}));//table._totalWidth - 2
            html.push('<tr>'); 
            for(var i = 0; i < len; i++){
                var thClass = [ thCellClass ];
                var field = fields[ i ];
                var title = field.title;
                var sortable = table.sortable && field.sortable;
                var currentSort = sortable && field.field && field.field == table.orderBy;
                var realThTextClass = thTextClass;

                if(i == 0){
                    realThTextClass += ' ' + getClass(table, 'hcell-text-first');
                }else if(i == len - 1 ){
                    realThTextClass += ' ' + getClass(table, 'hcell-text-last');
                }

                // 计算排序图标样式
                var sortIconHtml = '';
                var orderClass = '';
                if(sortable){
                    thClass.push(getClass(table, 'hcell-sort'));
                    if (currentSort) {
                        thClass.push(getClass(table, 'hcell-' + table.order));
                    }             
                    sortIconHtml = lib.format(tplSortIcon, { className : sortClass });
                }
                
                // 计算表格对齐样式
                if(field.align){
                    thClass.push(getClass(table, 'cell-align-' + field.align));
                }

                // 判断是否breakline模式
                if(table.breakLine|| field.breakLine){
                    thClass.push(breakClass);
                }

                var contentHtml;
                // 计算内容html
                if(typeof title == 'function') {
                    contentHtml = title.call(table);
                } else {
                    contentHtml = title;
                }
                contentHtml = contentHtml || '&nbsp;';
                
                                            
                html.push(  '<th id="' + getTitleCellId(table, i) + '" index="' + i + '"',
                            ' class="' + thClass.join(' ') + '"',
                            sortable ? ' sortable="1"' : '',
                            (i >= canDragBegin && i < canDragEnd ? ' dragright="1"' : ''),
                            (i <= canDragEnd && i > canDragBegin ? ' dragleft="1"' : ''),
                            ' style="width:' + (table.colsWidth[ i ] + table.rowWidthOffset) + 'px;',
                            (table.colsWidth[i] ? '' : 'display:none') + '">',
                            '<div class="' + realThTextClass +
                            (field.select ? ' ' + selClass : '') + '">',
                            contentHtml,
                            sortIconHtml,
                            tipHtml,
                            '</div></th>');
            }
            html.push('</tr></table>');

            return html.join('');
        }
        
        var tplSortIcon = '<div class="${className}"></div>';

        // 提示模板，此处还未定实现方式
        var tplTipIcon = '<div class="${className}" {1}></div>';
        
        /**
         * 获取表格头单元格的id
         * 
         * @private
         * @param {number} index 单元格的序号
         * @return {string}
         */
        function getTitleCellId(table, index) {
            return getId(table, 'titleCell') + index;
        }

        /**
         * 获取表格尾单元格的id
         * 
         * @private
         * @param {number} index 单元格的序号
         * @return {string}
         */
        function getFootCellId(table, index) {
            return getId(table, 'footCell') + index;
        }
        
        /**
         * 表格头单元格鼠标移入的事件handler
         * 
         * @private
         * @param {HTMLElement} cell 移出的单元格
         */
        function titleOverHandler(element, e) {
           titleOver(this, element);
        }

        function titleOver(table, element){
            if (table.isDraging || table.dragReady){
                return;
            }

            table.sortReady = 1;
            helper.addPartClasses(table, 'hcell-hover', element);
        }
        
        /**
         * 表格头单元格鼠标移出的事件handler
         * 
         * @private
         * @param {HTMLElement} cell 移出的单元格
         */
        function titleOutHandler(element, e){
            titleOut(this, element);
        }

        function titleOut(table, element){
            table.sortReady = 0;
            helper.removePartClasses(table, 'hcell-hover', element);
        }

        /**
         * 表格头单元格点击的事件handler
         * 
         * @private
         * @param {HTMLElement} cell 点击的单元格
         */
        function titleClickHandler(element, e){
            var table = this;
            if(table.sortReady && !table.disabled){ // 避免拖拽触发排序行为
                var index = element.getAttribute('index');
                var field = table.realFields[index];
                var orderBy = table.orderBy;
                var order = table.order;
                
                if(orderBy == field.field){
                    order = (!order || order == 'asc') ? 'desc' : 'asc';
                }else{
                    order = 'desc';
                }

                table.order = order;
                table.orderBy = field.field;

                if(field.sortable && table.datasource){
                    renderHead(table);
                    table.fire('sort', order);
                }
            }
        }
        
        /**
         * 获取表格头鼠标移动的事件handler
         * 
         * @private
         * @return {Function}
         */
        function headMoveHandler(table, e){
            var dragClass = 'startdrag';
            var range = 8; // 可拖拽的单元格边界范围
            if(table.isDraging){
                return;
            }
        
            var tar = e.srcElement || e.target ;
            // 寻找th节点。如果查找不到，退出
            tar = findDragCell(table, tar);
            if(!tar){
                return;
            }
            var el = this;
            var pageX = e.pageX || e.clientX + lib.page.getScrollLeft();

            // 获取位置与序号
            var pos = lib.getOffset(tar);
            var index = tar.getAttribute('index');
            var sortable = tar.getAttribute('sortable');
            
            // 如果允许拖拽，设置鼠标手型样式与当前拖拽点
            if( tar.getAttribute('dragleft') 
              && pageX - pos.left < range){
                sortable && (titleOut(table, tar)); // 清除可排序列的over样式
                helper.addPartClasses(table, dragClass, el);
                table.dragPoint = 'left';
                table.dragReady = 1;
            }else if(tar.getAttribute('dragright') 
                  && pos.left + tar.offsetWidth - pageX < range){
                sortable && (titleOut(table, tar)); // 清除可排序列的over样式
                helper.addPartClasses(table, dragClass, el);
                table.dragPoint = 'right';
                table.dragReady = 1;
            }else{
                helper.removePartClasses(table, dragClass, el);
                sortable && (titleOver(table, tar)); // 附加可排序列的over样式
                table.dragPoint = '';
                table.dragReady = 0;
            }
        }
        
        /**
         * 查询拖拽相关的表格头单元格
         * 
         * @private
         * @param {HTMLElement} target 触发事件的元素
         * @return {HTMLTHElement}
         */
        function findDragCell(taable, target){    
            while(target.nodeType == 1){
                if(target.nodeName == 'TH'){
                    return target;
                }
                target = target.parentNode;
            }
            return null;
        }
     
        /**
         * 获取表格头鼠标点击拖拽起始的事件handler
         * 
         * @private
         * @return {Function}
         */
        function dragStartHandler(table, e) {
            var dragClass = getClass(table, 'startdrag');
            var tar = e.target || e.srcElement;
            
            // 寻找th节点，如果查找不到，退出
            tar = findDragCell(table, tar);
            if(!tar){
                return;
            }
            
            if(lib.g(getId(table, 'head')).className.indexOf(dragClass) < 0){
                return;
            }            
                        
            // 获取显示区域高度
            table.htmlHeight = document.documentElement.clientHeight;
            
            // 记忆起始拖拽的状态
            table.isDraging = true;
            table.dragIndex = tar.getAttribute('index');
            table.dragStart = e.pageX || e.clientX + lib.page.getScrollLeft();

            // 绑定拖拽事件
            var realDragingHandler = lib.bind(dragingHandler, null, table);
            var realDragEndHandler = function(e){
                var retrunResult = true;
                try{ retrunResult = lib.bind(dragEndHandler, null, table)(e); }catch(er){}
                //清除拖拽向全局绑定的事件
                lib.un(document, 'mousemove', realDragingHandler);
                lib.un(document, 'mouseup', realDragEndHandler);
                return retrunResult;
            };

            lib.on(document, 'mousemove', realDragingHandler);
            lib.on(document, 'mouseup', realDragEndHandler);
            
            // 显示拖拽基准线
            showDragMark(table, table.dragStart);
            
            // 阻止默认行为
            lib.event.preventDefault(e);
            return false;
        }

        /**
         * 获取拖拽中的事件handler
         * 
         * @private
         * @desc 移动拖拽基准线
         * @return {Function}
         */
        function dragingHandler(table, evt) {
            var e = evt || window.event;
            showDragMark(table, e.pageX || e.clientX + lib.page.getScrollLeft());
            lib.event.preventDefault(e);
            return false;
        }
        
        /**
         * 显示基准线
         * 
         * @private
         */
        function showDragMark(table, left) {
            var mark = getDragMark(table);
            
            if (!table.top) {
                table.top = lib.getOffset(table.main).top;
            }    
            
            if (!mark) {
                mark = createDragMark(table);
            }
            
            mark.style.top = table.top + 'px';
            mark.style.left = left + 'px';
            mark.style.height = table.htmlHeight - table.top + lib.page.getScrollTop() + 'px';
        }
        
        /**
         * 隐藏基准线
         * 
         * @private
         */
        function hideDragMark(table) {
            var mark = getDragMark(table);
            mark.style.left = '-10000px';
            mark.style.top = '-10000px';
        }
        
        /**
         * 创建拖拽基准线
         * 
         * @private
         * @return {HTMLElement}
         */
        function createDragMark(table) {
            var mark = document.createElement('div');
            mark.id = getId(table, 'dragMark');
            mark.className = getClass(table, 'mark ');
            mark.style.top = '-10000px';
            mark.style.left = '-10000px';
            document.body.appendChild(mark);
            
            return mark;
        }
        
        /**
         * 获取基准线的dom元素
         * 
         * @private
         * @return {HTMLElement}
         */
        function getDragMark(table) {
            return lib.g(getId(table, 'dragMark'));
        }
        
        /**
         * 获取拖拽结束的事件handler
         * 
         * @private
         * @return {Function}
         */
        function dragEndHandler(table, evt) {
            var e = evt || window.event;
            var index = parseInt(table.dragIndex, 10);
            var pageX = e.pageX || e.clientX + lib.page.getScrollLeft();
            var fields = table.realFields; 
            var fieldLen = fields.length;
            var alterSum = 0;
            var colsWidth = table.colsWidth;
            var revise = 0;

            // 校正拖拽元素
            // 如果是从左边缘拖动的话，拖拽元素应该上一列
            if (table.dragPoint == 'left') {
                index--;
            }
            
            // 校正拖拽列的宽度
            // 不允许小于最小宽度
            var minWidth = table.minColsWidth[ index ];
            var offsetX = pageX - table.dragStart;
            var currentWidth = colsWidth[ index ] + offsetX;
            if (currentWidth < minWidth) {
                offsetX += (minWidth - currentWidth);
                currentWidth = minWidth;
            }
            
            var alters = [];
            var alterWidths = [];
            //查找宽度允许改变的列
            for (var i = index + 1; i < fieldLen; i++) {
                if (!fields[ i ].stable && colsWidth[i] > 0) {
                    alters.push(i);
                    alterWidth = colsWidth[ i ];
                    alterWidths.push(alterWidth);
                    alterSum += alterWidth;
                }
            }

            // 计算允许改变的列每列的宽度
            var leave = offsetX;
            var alterLen = alters.length;
            for (var i = 0; i < alterLen; i++) {
                var alter = alters[ i ];
                var alterWidth = alterWidths[ i ];    //当前列宽
                var roughWidth = offsetX * alterWidth / alterSum; // 变更的列宽
                
                // 校正变更的列宽
                // roughWidth可能存在小数点
                if (leave > 0) {
                    offsetWidth = Math.ceil(roughWidth);
                } else {
                    offsetWidth = Math.floor(roughWidth);
                }
                offsetWidth = (Math.abs(offsetWidth) < Math.abs(leave) ? offsetWidth : leave);

                // 校正变更后的列宽
                // 不允许小于最小宽度
                alterWidth -= offsetWidth;
                leave -= offsetWidth;
                minWidth = table.minColsWidth[ alter ];
                if (alterWidth < minWidth) {
                    revise += minWidth - alterWidth;
                    alterWidth = minWidth;
                }
                
                colsWidth[alter] = alterWidth;
            }

            // 校正拖拽列的宽度
            // 当影响的列如果宽度小于最小宽度，会自动设置成最小宽度
            // 相应地，拖拽列的宽度也会相应减小
            currentWidth -= revise;

            colsWidth[index] = currentWidth;

            // 重新绘制每一列
            resetColumns(table);

            table.isDraging = false;
            hideDragMark(table);
            
            lib.event.preventDefault(e);
            return false;
        }
        
        /**
         * 绘制表格主体
         * 
         * @private
         */
        function renderBody(table) {
            var tBody = getBody(table);

            if(!tBody){
                var type = 'body';
                var id = getId(table, type);

                tBody = document.createElement('div');
                tBody.id = id;
                tBody.className = getClass(table, type);
                table.main.appendChild(tBody);
            }

            tBody.style.width = table.realWidth + 'px';
            tBody.innerHTML = getBodyHtml(table);
        }

         /**
         * 更新表格指定高度
         * 
         * @private
         */
        function updateBodyHeight(table, tBody){
            var style = tBody.style;

            // 如果设置了表格体高度
            // 表格需要出现横向滚动条
            if (table.bodyHeight) {
                style.height = table.bodyHeight + 'px';
                style.overflowX = 'hidden';
                style.overflowY = 'auto';
            }else{
                style.height = 'auto';
                style.overflowX = 'visible';
                style.overflowY = 'visible';
            }
        }
        
        /**
         * 获取表格主体的html
         * 
         * @private
         * @return {string}
         */
        function getBodyHtml(table) {
            var data = table.datasource || [];
            var dataLen = data.length;
            var html = [];
            
            if (!dataLen) {
                return table.noDataHtml;
            }

            for (var i = 0; i < dataLen; i++) {
                var item = data[i];
                html[i] = getRowHtml(table, item, i);
            }
            
            return html.join('');  
        }
        
        var tplRowPrefix = '<div id="${id}" class="${className}" index="${index}">';
        /**
         * 获取表格体的单元格id
         * 
         * @private
         * @param {number} rowIndex 当前行序号
         * @param {number} fieldIndex 当前字段序号
         * @return {string}
         */
        function getBodyCellId(table, rowIndex, fieldIndex) {
            return getId(table, 'cell') + rowIndex + "_" + fieldIndex;
        }
        
        /**
         * 获取表格行的html
         * 
         * @private
         * @param {Object} data 当前行的数据
         * @param {number} index 当前行的序号
         * @return {string}
         */
        function getRowHtml(table, data, index) {
            var html = [];
            var tdCellClass = getClass(table, 'cell');
            var tdBreakClass = getClass(table, 'cell-break');
            var tdTextClass = getClass(table, 'cell-text');
            var fields = table.realFields;
            var subrow = table.subrow && table.subrow != 'false';
                
            html.push(
                lib.format( tplRowPrefix,
                            {
                                id : getId(table, 'row') + index,
                                className : getClass(table, 'row') + ' ' 
                                          + getClass(table, 'row-' + ((index % 2) ? 'odd' : 'even')),
                                index: index
                            }
                ),
                lib.format(tplTablePrefix, { width : '100%' , controlTableId : table.id })
            );

            for(var i = 0, fieldLen = fields.length; i < fieldLen; i++){
                var tdClass = [tdCellClass];
                var textClass = [tdTextClass];
                var field = fields[i];
                var content = field.content;
                var colWidth = table.colsWidth[i];
                var subentry = subrow && field.subEntry;
                var editable = table.editable && field.editable && field.edittype;
                

                if(i == 0){
                    textClass.push(getClass(table, 'cell-text-first'));
                }else if(i == fieldLen - 1 ){
                    textClass.push(getClass(table, 'cell-text-last'));
                }

                // 生成可换行列的样式
                if( table.breakLine || field.breakLine){
                    tdClass.push(tdBreakClass);
                }

                // 生成选择列的样式
                if(field.select){
                    textClass.push(getClass(table, 'cell-sel'));
                }
                
                // 计算表格对齐样式
                if(field.align){
                    tdClass.push(getClass(table, 'cell-align-' + field.align));
                }
                
                // 计算表格排序样式
                if(field.field && field.field == table.orderBy){
                    tdClass.push(getClass(table, 'cell-sorted'));
                }
                // 构造内容html
                contentHtml = '<div class="' + textClass.join(' ') + '">'
                                + ('function' == typeof content 
                                    ? content.call(table, data, index, i) 
                                    : data[content])
                                + '</div>';

                subentryHtml = '&nbsp;';
                if(subentry){
                    if ( typeof field.isSubEntryShow != 'function'
                      || field.isSubEntryShow.call(table, data, index, i) !== false){
                        subentryHtml = getSubEntryHtml(table, index);
                    }
                    
                    tdClass.push(getClass(table, 'subentryfield'));
                    contentHtml = '<table width="100%" collpadding="0" collspacing="0">'
                                + '<tr><td width="' + table.subEntryWidth + '" align="right">' + subentryHtml
                                + '</td><td>' + contentHtml + '</td></tr></table>';
                }
                html.push(  '<td id="' + getBodyCellId(table, index, i) + '"',
                            'class="' + tdClass.join(' ')  + '"',
                            ' style="width:' + (colWidth + table.rowWidthOffset) + 'px;',
                            (colWidth ? '' : 'display:none'),
                            '" controlTable="' + table.id,
                            '" row="' + index + '" col="' + i + '">',
                            contentHtml,
                            '</td>');
            }

            html.push('</tr></table></div>');
            
            // 子行html
            if(subrow){
                html.push(getSubrowHtml(table, index));
            }
            return html.join('');
        }

        /**
         * 表格行鼠标移上的事件handler
         * 
         * @private
         * @param {number} index 表格行序号
         */
        function rowOverHandler(element, e) {
            if(this.isDraging){
                return;
            }
            helper.addPartClasses(this, 'row-hover',element);
        }
        
        /**
         * 表格行鼠标移出的事件handler
         * 
         * @private
         * @param {number} index 表格行序号
         */
        function rowOutHandler(element, e) {
            helper.removePartClasses(this, 'row-hover', element);
        }
        
        /**
         * 表格行鼠标点击的事件handler
         * 
         * @private
         * @param {number} index 表格行序号
         */
        function rowClickHandler(element, e) {
            var table = this;
            if(table.selectMode == 'line' && !table.disabled){
                if (table.dontSelectLine) {
                    table.dontSelectLine = false;
                    return;
                }
                var index = element.getAttribute('index');
                var input;
                
                switch(table.select){
                    case 'multi':
                        input = lib.g(getId(table, 'multiSelect') + index);
                        // 如果点击的是checkbox，则不做checkbox反向处理
                        if (typeof table.preSelectIndex == 'undefined' || table.preSelectIndex === null) {
                            input.checked = !input.checked;
                        }
                        selectMulti(table, index);
                        table.preSelectIndex = null;
                        break;

                    case 'single':
                        input = lib.g(getId(table, 'singleSelect') + index);
                        input.checked = true;
                        selectSingle(table, index);
                        break;
                }
            }
        }
        
        /**
         * subrow入口的html模板
         * 
         * @private
         */
        var tplSubEntry = '<div class="${className}" id="${id}" title="${title}" index="${index}"></div>';
        
        /**
         * 获取子内容区域入口的html
         *
         * @private
         * @return {string}
         */
        function getSubEntryHtml(table, index) {
            return lib.format(
                tplSubEntry,
                {
                    className : getClass(table, 'subentry'),
                    id :  getSubentryId(table, index),
                    title :  table.subEntryOpenTip,
                    index : index
                }
           );
        }
        
        /**
         * 获取子内容区域的html
         *
         * @private
         * @return {string}
         */
        function getSubrowHtml(table, index) {
            return '<div id="' + getSubrowId(table, index)
                +  '" class="' + getClass(table, 'subrow') + '"'
                +  ' style="display:none"></div>';
        }
        
        /**
         * 获取表格子行的元素id
         *
         * @private
         * @param {number} index 行序号
         * @return {string}
         */
        function getSubrowId(table, index) {
            return getId(table, 'subrow') + index;
        }
        
        /**
         * 获取表格子行入口元素的id
         *
         * @private
         * @param {number} index 行序号
         * @return {string}
         */
        function getSubentryId(table, index) {
            return getId(table, 'subentry') + index;
        }
        

        function entryOverHandler(element, e){
            entryOver(this, element);
        }

        /**
         * 处理子行入口元素鼠标移入的行为
         *
         * @private
         * @param {number} index 入口元素的序号
         */
        function entryOver(table, element) {
            var opened = /subentry-opened/.test(element.className);
            var classBase = 'subentry-hover';
                
            if (opened) {
                classBase = 'subentry-opened-hover';
            }
            helper.addPartClasses(table, classBase, element);
        }
        
        function entryOutHandler(element, e){
            entryOut(this, element);
        }
        /**
         * 处理子行入口元素鼠标移出的行为
         *
         * @private
         * @param {number} index 入口元素的序号
         */
        function entryOut(table, element) {
            helper.removePartClasses(table, 'subentry-hover', element);
            helper.removePartClasses(table, 'subentry-opened-hover', element);
        }
        
        /**
         * 触发subrow的打开|关闭
         *
         * @public
         * @param {number} index 入口元素的序号
         */
        function fireSubrow(element, e) {
            var table = this;
            var el = element;
            var index = el.getAttribute('index');
            var datasource = table.datasource;
            var dataLen = (datasource instanceof Array && datasource.length);
            
            if (!dataLen || index >= dataLen){
                return;
            }
            
            if (!el.getAttribute('data-subrowopened')){
                var dataItem = datasource[index];
                if (table.fire('subrowopen', {index:index, item: dataItem}) !== false) {
                    openSubrow(table, index, el);
                }
            }else{
                closeSubrow(table, index, el);
            }
            entryOver(table, el);
        }
        
        /**
         * 关闭子行
         *
         * @private
         * @param {number} index 子行的序号
         */
        function closeSubrow(table, index, element) {
            var entry = element;
            
            if (table.fire('subrowclose', {index:index, item: table.datasource[index]}) !== false) {
                entryOut(table, entry);
                table.subrowIndex = null;
                
                helper.removePartClasses(table, 'subentry-opened', entry);
                helper.removePartClasses(table, 'row-unfolded', getRow(table, index));
                
                entry.setAttribute('title', table.subEntryOpenTip);
                entry.setAttribute('data-subrowopened', '');
                
                lib.g(getSubrowId(table, index)).style.display = 'none';
                return true;
            }
            return false;
        }
        
        /**
         * 打开子行
         *
         * @private
         * @param {number} index 子行的序号
         */
        function openSubrow(table, index, element) {
            var currentIndex = table.subrowIndex;
            var entry = element;
            var closeSuccess = 1;
            
            if (typeof currentIndex != 'undefined' && currentIndex !== null){
                closeSuccess = closeSubrow(table, currentIndex, lib.g(getSubentryId(table, currentIndex)));
            }
            
            if (!closeSuccess){
                return;
            }

            helper.addPartClasses(table, 'subentry-opened', entry);
            helper.addPartClasses(table, 'row-unfolded', getRow(table, index));

            entry.setAttribute('title', table.subEntryCloseTip);
            entry.setAttribute('data-subrowopened', '1');
            
            lib.g(getSubrowId(table, index)).style.display = '';
            
            table.subrowMutex && (table.subrowIndex = index);
        }
        
        /**
         * 初始化resize的event handler
         * 
         * @private
         */
        function initResizeHandler(table) {
            table.viewWidth = lib.page.getViewWidth();
            table.viewHeight = lib.page.getViewHeight();
            
            var resizeHandler = function(){
                var viewWidth = lib.page.getViewWidth(),
                    viewHeight = lib.page.getViewHeight();
                    
                if(viewWidth == table.viewWidth && viewHeight == table.viewHeight){
                    return;
                }
                
                table.viewWidth = viewWidth;
                table.viewHeight = viewHeight;

                handleResize(table);
            };

            // 在dispose的时候会释放的哈
            lib.on(window, 'resize', resizeHandler);
            table.on(
                'afterdispose',
                function () {
                    lib.un(window, 'resize', resizeHandler);
                }
            );
        }
        
        /**
         * 浏览器resize的处理
         *
         * @private
         */
        function handleResize(table) {
            var head = getHead(table);
            var foot = getFoot(table);
            table.realWidth = getWidth(table);
            var widthStr = table.realWidth + 'px';
            
            // 设置主区域宽度
            table.main.style.width = widthStr;
            getBody(table).style.width = widthStr;
            head && (head.style.width = widthStr);
            foot && (foot.style.width = widthStr);
            
            // 重新绘制每一列  
            initColsWidth(table);
            resetColumns(table);    
            if(table.followHead) {
                var walker = table.main.parentNode.firstChild;
                var i = 0;
                while (walker) {
                    if (walker.nodeType == 1 && walker.getAttribute('followThead')){
                        walker.style.width = table.realWidth - table.followWidthArr[ i++ ] + 'px';
                    }
                    walker = walker.nextSibling;
                }
            }    

            table.topReseter && table.topReseter();
        }
        
        /**
         * 纵向锁定初始化
         *
         * @private
         */
         function initTopResetHandler(table) {
            if (!table.followHead) {
                return;
            }
            var walker = table.main.parentNode.firstChild;
            var domHead = getHead(table);
            var followWidths = table.followWidthArr;
            var placeHolderId = getId(table, 'TopPlaceholder');
            var domPlaceholder = document.createElement('div');
            var mainOffestLeft = lib.getOffset(table.main).left ;
            // 占位元素
            // 否则元素浮动后原位置空了将导致页面高度减少，影响滚动条  
            domPlaceholder.id = placeHolderId;
            domPlaceholder.style.width = '100%';
            domPlaceholder.style.display = 'none';

            lib.insertBefore(domPlaceholder, table.main);
            domPlaceholder = null;
            
            // 写入表头跟随元素的宽度样式
            for (var i = 0, len = table.followDoms.length; i < len; i++) {
                table.followDoms[i].style.width = table.realWidth - followWidths[i] + 'px';
            }
            domHead && (domHead.style.width = table.realWidth + 'px');

            table.topReseter = function () {
                var scrollTop = lib.page.getScrollTop();
                var scrollLeft = lib.page.getScrollLeft();
                var fhArr = table.followHeightArr;
                var fhLen = fhArr.length;
                var posStyle = '';
                var followDoms = table.followDoms;
                var len = followDoms.length;
                var placeHolder = lib.g(placeHolderId);
                var mainHeight = parseInt(lib.getComputedStyle(table.main , 'height'));
                
                function setPos(dom, pos, top , left) {
                    if (dom) {
                        dom.style.top = top + 'px';
                        dom.style.left = left + 'px'; 
                        dom.style.position = pos;
                    }
                }

                if (lib.ie && lib.ie < 7) {
                    if (scrollTop > table.followTop && scrollTop - table.followTop < mainHeight) {
                        posStyle = 'absolute';
                        placeHolder.style.height = fhArr[fhLen - 1] + domHead.offsetHeight + 'px';
                        placeHolder.style.display = '';
                        var curLeft = mainOffestLeft - scrollLeft ;
                        for (var i = 0 ; i < len; i++) {
                            setPos(followDoms[i], posStyle, fhArr[i] + scrollTop, curLeft);
                        }

                        setPos(domHead, posStyle, fhArr[fhLen - 1] + scrollTop, curLeft);
                    } else {
                        placeHolder.style.height  = 0;
                        placeHolder.style.display = 'none';
                        posStyle = '';
                        
                        for (var i = 0 ; i < len; i++) {
                            setPos(followDoms[i], posStyle, 0 , 0);
                        }

                        setPos(domHead, posStyle, 0 , 0);
                    }
                } else {
                    if (scrollTop > table.followTop && scrollTop - table.followTop < mainHeight) {
                        placeHolder.style.height = fhArr[fhLen - 1] + domHead.offsetHeight + 'px';
                        placeHolder.style.display = '';
                        posStyle = 'fixed';
                        var curLeft = mainOffestLeft - scrollLeft ;
                        for (var i = 0; i < len; i++) {
                            setPos(followDoms[i], posStyle, fhArr[i] ,curLeft );
                        }

                        setPos(domHead, posStyle, fhArr[fhLen - 1] , curLeft);
                    } else {
                        placeHolder.style.height  = 0;
                        placeHolder.style.display = 'none';
                        posStyle = '';
                        
                        for (var i = 0; i < len; i++) {
                            setPos(followDoms[i], posStyle, 0, 0);
                        }

                        setPos(domHead, posStyle, 0, 0);
                    }
                }
                
            };
            lib.on(window, 'scroll', table.topReseter);    
        }
        
        /**
         * 重新设置表格每个单元格的宽度
         * 
         * @private
         */
        function resetColumns(table) {
            var datasource = table.datasource || [];
            var colsWidth = table.colsWidth;
            var foot = table.foot;
            var id = table.id;
            var len = foot instanceof Array && foot.length;
            var dLen = datasource.length;
            var tds = getBody(table).getElementsByTagName('td');
            var tables = table.main.getElementsByTagName('table');
            var tdsLen = tds.length;
            var index = 0;
            
            // 重新设置表格尾的每列宽度
            if (len) {
                var colIndex = 0;
                for (var i = 0; i < len; i++) {
                    var item    = foot[i];
                    var width   = colsWidth[colIndex];
                    var colspan = item.colspan || 1;

                    for (var j = 1; j < colspan; j++) {
                        width += colsWidth[colIndex + j];
                    }
                    colIndex += colspan;

                    var td = lib.g(getFootCellId(table, i));
                    width = Math.max(width + table.rowWidthOffset, 0);
                    
                    td.style.width = width + 'px';
                    td.style.display = width ? '' : 'none';
                }
            }

            // 重新设置表格头的每列宽度
            len = colsWidth.length;
            if (!table.noHead) {
                for (i = 0; i < len; i++) {
                    var width = Math.max(colsWidth[i] + table.rowWidthOffset, 0);

                    var td = lib.g(getTitleCellId(table, i));
                    td.style.width = width + 'px';
                    td.style.display = width ? '' : 'none';
                }
            }

            // 重新设置表格体的每列宽度
            var j = 0;
            for (var i = 0; i < tdsLen; i++) {
                var td = tds[i];
                if (td.getAttribute('controlTable') == id) {
                    var width = Math.max(colsWidth[j % len] + table.rowWidthOffset, 0);
                    td.style.width = width + 'px';
                    td.style.display = width ? '' : 'none';
                    j++;
                }
            }
        }
        
        /**
         * 获取第一列的多选框
         * 
         * @private
         */
        function getMultiSelectTpl(table){
            return{ 
                width : 36,
                stable : true,
                select : true,
                title : function (item, index) {
                    return lib.format(  '<input type="checkbox" id="${id}" class="${className}" index="${index}" ${disabled}/>',
                                        {
                                            id : getId(table, 'selectAll'),
                                            className : getClass(table, 'selectAll'),
                                            disabled : table.disabled ? 'disabled="disabled"' : '',
                                            index : index
                                        }
                   );
                            
                },
                
                content : function (item, index) {
                    return lib.format(  '<input type="checkbox" id="${id}" class="${className}"  index="${index}" ${disabled}/>',
                                        {
                                            id : getId(table, 'multiSelect') + index,
                                            className : getClass(table, 'multiSelect'),
                                            disabled : table.disabled ? 'disabled="disabled"' : '',
                                            index : index
                                        }
                   );
                }
            }
        }
        
        /**
         * 第一列的单选框
         * 
         * @private
         */
         function getSingleSelectTpl(table){
            return {
                width : 30,
                stable : true,
                title : '&nbsp;',
                select : true,
                content : function (item, index) {
                    var id = getId(table, 'singleSelect');
                    return lib.format(  '<input type="radio" id="${id}" name="${name}" class="${className}" index="${index}"/>',
                                        {
                                            id : id + index,
                                            name : id ,
                                            className : getClass(table, 'singleSelect'),
                                            index : index
                                        }
                   );
                }
            }
        }
        
        /**
         * 行的checkbox点击处理函数
         * 
         * @private
         */
        function rowCheckboxClick(element, e) {
            var index = element.getAttribute('index');
            if (this.selectMode != 'line') {
                selectMulti(this, index);
            } else {
                this.preSelectIndex = index;
            }
        }
        
        /**
         * 根据checkbox是否全部选中，更新头部以及body的checkbox状态
         * 
         * @private
         * @param {number} index 需要更新的body中checkbox行，不传则更新全部
         */
        function selectMulti(table, index) {
            var selectAll = getHeadCheckbox(table);
            var inputs = findSelectBox(table, 'checkbox');
            var allChecked = true;
            var selected = [];
            var cbIdPrefix = getId(table, 'multiSelect');
            var updateAll = typeof index == 'undefined' || index === null;
            var selectedClass = 'row-selected';

            for (var i = 0, len = inputs.length; i < len; i++) {
                var input = inputs[i];
                if (input.id.indexOf(cbIdPrefix) >= 0){
                    var inputIndex = input.getAttribute('index');
                    if (updateAll){
                        var row = table.getRow(inputIndex);
                    }
                    if (!input.checked) {
                        allChecked = false;
                        // faster
                        updateAll && helper.removePartClasses(table, selectedClass, row); 
                    } else {
                        selected.push(inputIndex);
                        // faster
                        updateAll && helper.addPartClasses(table, selectedClass, row);
                    }
                }
            }

            table.selectedIndex = selected;
            table.fire('selectChange', selected);

            if (!updateAll) {
                var row = getRow(table, index);
                var input = lib.g(cbIdPrefix + index);
                if (input.checked) {
                    helper.addPartClasses(table, selectedClass, row);
                } else {
                    helper.removePartClasses(table, selectedClass, row);
                }
            }

            selectAll.checked = allChecked;
        }

        /**
         * 全选/不选 所有的checkbox表单
         * 
         * @private
         */
        function toggleSelectAll(arg) {
            selectAll(this, getHeadCheckbox(this).checked);
        }

        /**
         * 获取所有选择Box
         * 
         * @private
         * @param {string} type box类型
         */
        function findSelectBox(table, type){
            var inputs = getBody(table).getElementsByTagName('input');
            var result = [];
            for (var i = 0, len = inputs.length; i < len; i++){
                var input = inputs[i];
                var inputId = input.id;
                 if (input.getAttribute('type') == type && inputId){
                    result.push(input)
                 }
            }
            return result;
        }
        
        /**
         * 更新所有checkbox的选择状态
         * 
         * @private
         * @param {boolean} checked 是否选中
         */
        function selectAll(table, checked) {
            var inputs = findSelectBox(table, 'checkbox');
            var selected = [];
            var selectedIndex = [];
            var cbIdPrefix = getId(table, 'multiSelect');
            for(var i = 0, len = inputs.length; i < len; i++){
                var input = inputs[i];
                if (input.id.indexOf(cbIdPrefix) >= 0){
                    var index = input.getAttribute('index');

                    inputs[i].checked = checked;
                    
                    if (checked) {
                        selected.push(index);
                        helper.addPartClasses(table, 'row-selected', getRow(table, index));
                    } else {
                        helper.removePartClasses(table, 'row-selected', getRow(table, index));
                    }
                }
            }
            table.selectedIndex = selected;
            table.fire('selectChange', selected);
        }
        
        function selectSingleHandler(element, e){
            selectSingle(this, element.getAttribute('index'));
        }

        /**
         * 单选选取
         * 
         * @private
         * @param {number} index 选取的序号
         */
        function selectSingle(table, index) {
            var selectedIndex = table.selectedIndex;

            table.fire('selectChange', index);

            if(selectedIndex && selectedIndex.length){
                helper.removePartClasses(table, 'row-selected', getRow(table, selectedIndex[0]));
            }
            table.selectedIndex = [index];
            helper.addPartClasses(table, 'row-selected', getRow(table, index));
        }
        
        /**
         * 重置表头样式
         * 
         * @private
         */
        function resetHeadStyle(table) {
            var ths = getHead(table).getElementsByTagName('th');
            var len = ths.length;
                
            while(len--) {
                var th = ths[len];
                helper.removePartClasses(table, 'thcell_sort', th.firstChild);
            }    
        }

        /**
         * 设置元素的disable样式
         * 
         * @private
         */
        function setDisabledStyle(table){
            var inputs = findSelectBox(table, table.select == 'multi' ? 'checkbox' : 'radio');
            for (var i = inputs.length - 1; i >= 0; i--) {
                if(table.disabled){
                    inputs[i].setAttribute('disabled', 'disabled');
                }else{
                    inputs[i].removeAttribute('disabled', 'disabled');
                }
            }
            if(table.select == 'multi'){
                var selectAll = getHeadCheckbox(table);
                if(selectAll){
                    if(table.disabled){
                    selectAll.setAttribute('disabled', 'disabled');
                    }else{
                        selectAll.removeAttribute('disabled', 'disabled');
                    }
                }
            }
        }

        /**
        * 生成委托处理函数
        *
        */
        function getDelegateHandler(element, handlerQueue, scrope) {
            return function(e){
                var e = e || window.event;
                var cur = e.target || e.srcElement;
                while(cur){
                    if (cur.nodeType === 1 && (cur.disabled !== true || e.type !== "click")) {
                        for (var i = handlerQueue.length - 1; i >= 0; i--) {
                            var handlerItem = handlerQueue[i];
                            if(!handlerItem.matchFn || handlerItem.matchFn(cur)){
                                handlerItem.handler.call(scrope, cur, e);
                            }
                        };
                    }
                    if(cur == element){
                        break;
                    }
                    cur = cur.parentNode ;   
                }
            }
        }

        /**
        * 事件委托
        */
        function delegate(control, element, eventType, handlerQueue){
            helper.addDOMEvent( control, element, eventType, 
                                getDelegateHandler(element, handlerQueue, control)
            );
        }

        /**
        * 初始化main元素事件处理函数
        */
        function initMainEventhandler(table){
            var getClassMatch = function(className){
                return function(e){
                    return lib.hasClass(e, className);
                }
            };

            var rowClass = helper.getPartClasses(table, 'row')[0];
            var titleClass =  helper.getPartClasses(table, 'hcell')[0];
            var subentryClass = helper.getPartClasses(table, 'subentry')[0];
            var selectAllClass = helper.getPartClasses(table, 'selectAll')[0];
            var multiSelectClass = helper.getPartClasses(table, 'multiSelect')[0];
            var singleSelectClass = helper.getPartClasses(table, 'singleSelect')[0];

            delegate(table, table.main, 'mouseover', [
                    { handler : rowOverHandler, matchFn : getClassMatch(rowClass) },
                    { handler : titleOverHandler, matchFn : getClassMatch(titleClass) },
                    { handler : entryOverHandler, matchFn : getClassMatch(subentryClass) }
            ]);

            delegate(table, table.main, 'mouseout', [
                    { handler : rowOutHandler, matchFn : getClassMatch(rowClass) },
                    { handler : titleOutHandler, matchFn : getClassMatch(titleClass) },
                    { handler : entryOutHandler, matchFn : getClassMatch(subentryClass) }
            ]);

            delegate(table, table.main, 'click', [
                    { handler : rowClickHandler, matchFn : getClassMatch(rowClass) },
                    { handler : titleClickHandler, matchFn : getClassMatch(titleClass) },
                    { handler : fireSubrow, matchFn : getClassMatch(subentryClass) },
                    { handler : toggleSelectAll, matchFn : getClassMatch(selectAllClass) },
                    { handler : rowCheckboxClick, matchFn : getClassMatch(multiSelectClass) },
                    { handler : selectSingleHandler, matchFn : getClassMatch(singleSelectClass) }
            ]);
        }

        Table.prototype = {
            /**
             * 控件类型
             * 
             * @type {string}
             */
            type: 'Table',


            initStructure : function() {
                this.realWidth = getWidth(this);
                this.main.style.width = this.realWidth + 'px';   

                initResizeHandler(this);
                initMainEventhandler(this);
            },

            /**
             * 渲染控件
             * 
             * @override
             */
            repaint: function (changes, changesIndex) {
                 // 初始化控件主元素上的行为
                var table = this;
                var main = table.main;

                var allProperities = {
                    bodyHeight: false,
                    breakLine: false,
                    datasource: false,
                    columnResizable: false,
                    fields: false,
                    followHead: false,
                    noDataHtml: false,
                    noHead: false,
                    select: false,
                    selectMode: false,
                    sortable:false,
                    foot: false
                };

                if (!changes) {
                    for (var property in allProperities) {
                        if (allProperities.hasOwnProperty(property)) {
                            allProperities[property] = true;
                        }
                    }
                }
                // 局部渲染
                else {
                    for (var i = 0; i < changes.length; i++) {
                        var record = changes[i];
                        allProperities[record.name] = true;
                    } 
                }

                var fieldsChanged = false;
                var colsWidthChanged = false;

                if(allProperities['fields']
                || allProperities['select']){
                    initFields(table);
                    fieldsChanged = true;
                }
                if(fieldsChanged
                || allProperities['noHead']
                || allProperities['breakLine']
                || allProperities['columnResizable']){
                    initMinColsWidth(table);
                    initColsWidth(table);
                    renderHead(table);
                    colsWidthChanged = true;
                }
                if(allProperities['followHead']){
                    caching(table);
                    initTopResetHandler(table);
                }
                if(fieldsChanged
                || colsWidthChanged
                || allProperities['noDataHtml']
                || allProperities['datasource']){
                    renderBody(table);
                }
                if(allProperities['bodyHeight']){
                    updateBodyHeight(table, getBody(table));
                }
                if(fieldsChanged
                || colsWidthChanged
                || allProperities['foot']){
                    renderFoot(table);
                }

                table.extraRepaint = helper.createRepaint({
                    name: 'disabled',
                    paint: setDisabledStyle
                });
                table.extraRepaint(changes, changesIndex);

                // 如果未绘制过，初始化resize处理
                if (helper.isInStage(table, 'RENDERED')){
                    // 重绘时触发onselectChange事件
                    switch (table.select) {
                    case 'multi':
                        table.fire('selectChange', []);
                        break;
                    }
                }
                
                // 如果表格的绘制导致浏览器出现纵向滚动条
                // 需要重新计算各列宽度
                if (table.realWidth != getWidth(table)) {
                    handleResize(table);
                }
            },

             /**
             * 获取表格子行的元素
             *
             * @public
             * @param {number} index 行序号
             * @return {HTMLElement}
             */
            getSubrow : function(index) {
                return lib.g(getSubrowId(this, index));    
            },

            /**
             * 销毁释放控件
             * 
             * @override
             */
            dispose: function () {
                helper.beforeDispose(this);

                var main = this.main;
                if (main) {
                    var head = lib.g(getId(this, 'head'));
                    var mark = lib.g(getId(this, 'dragMark'));

                    // 释放表头跟随的元素引用
                    this.followDoms = null;

                    // 移除拖拽基准线
                    if (mark) {
                        document.body.removeChild(mark);
                    }
                    // remove scroll事件listener
                    if (this.topReseter) {
                        lib.un(window, 'scroll', this.topReseter);
                        this.topReseter = null;
                    }
                }
                helper.dispose(this);
                helper.afterDispose(this);
            }
        };

        require('./lib').inherits(Table, Control);
        require('./main').register(Table);

        return Table;
    }
);
