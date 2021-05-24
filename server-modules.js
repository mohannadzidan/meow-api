var modules = [];
var unregisteredModules = [];
var _app;

exports.registerModule = function(module){
    if(!module.init) throw new Error('The module doesn\'t have initialization function init(app : Express)!');
    modules.push(module);
    if(_app){
        module.init(_app);
    }else{
        unregisteredModules.push(module);
    }
}

/**
 * 
 * @param {Express} app 
 */
exports.setApp = function(app){
    _app = app;
    while(unregisteredModules.length > 0){
        unregisteredModules.pop().init(app);
    }
}