{
    // appDir: './',
    baseUrl: '../src',
    name: 'esui',
    packages: [
        {
            'name': 'mini-event',
            'location': '../dep/mini-event/1.0.2/src',
            'main': 'main'
        },
        {
            'name': 'underscore',
            'location': '../dep/underscore/1.7.0/src',
            'main': 'underscore'
        },
        {
            'name': 'moment',
            'location': '../dep/moment/2.9.0/src',
            'main': 'moment'
        },
        {
            'name': 'etpl',
            'location': '../dep/etpl/3.0.0/src',
            'main': 'main'
        },
        {
            'name': 'esui',
            'location': '../src',
            'main': 'main'
        }
    ],
    include:[
        'esui',
        'esui/RangeCalendar'
    ],
    out: 'esui.js'
}