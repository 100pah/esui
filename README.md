
#说明

##RangeCalendar的效果

demo/RangeCalendar-plain.html
其中包括，如何初始化esui控件，如何监听change事件。

##构建脚本

在build中：sh build.sh

##集成esui要做的事情

（长久没做，可能没说全哦）

1. 在engine中，搜“isEcuiControl”，在这个地方，类同得，加上esui的：“增加事件监听器”和“fire事件”的逻辑。
    （总共两处：addEventListener、dispatchEvent两个方法中）。

2. 在repo-dict中增加相应的日历的配置项，如可模仿
    {
        "clzKey": "RANGE_POP_CALENDAR",
        "clzPath": "ecui.ui.IstCalendar",
        "clzType": "VUI",
        "adapterMethod": { "dispose": "ecuiDispose" },
        "adapterPath": "di.shared.adapter.IstCalendarVUIAdapter",
        "dataOpt": {
            "mode": "RANGE",
            "viewMode": "POP"
        },
        "rtplParamHandler": "com.baidu.rigel.datainsight.engine.service.impl.DIParamHandler4TimeImpl",
        "caption": "简单弹出式日历（范围选择）"
    },
    来写，其中：
    在general-adapter-method.js中增加，esuiCreate、esuiDispose方法。
    创建XXXXUIAdapter。



sushuang@baidu.com