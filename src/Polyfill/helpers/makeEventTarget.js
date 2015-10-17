/**
 * Created by kevin on 10/7/15.
 */

module.exports = function makeEventListener(obj){
    var eventMap = new Map();

    obj.addEventListener = function(type, cb){
        var cbList = eventMap.get(type) || [];
        if(cbList.indexOf(cb) < 0) {
            cbList.push(cb);
            eventMap.set(type, cbList);
        }
    };
    obj.removeEventListener = function(type, cb){
        var cbList = eventMap.get(type) || [];
        var idx = cbList.indexOf(cb);
        if(idx >= 0) {
            cbList.splice(idx, 1);
            eventMap.set(type, cbList);
        }
    };
    obj.dispatchEvent = function(ev){
        var cbList = eventMap.get(ev.type) || [];

        if(typeof obj['on'+ev.type] === 'function'){
            cbList.push(obj['on'+ev.type]);
        }
        var previousSrcElement = ev.srcElement;
        var previousTarget = ev.target;
        Object.defineProperties(ev, {
            srcElement: { value: obj, configurable: true },
            target: { value: obj, configurable: true }
        });
        cbList.forEach(function(cb){
            cb(ev);
        });
        Object.defineProperties(ev, {
            srcElement: { value: previousSrcElement, configurable: true },
            target: { value: previousTarget, configurable: true }
        });

        return true;
    };
    return obj;
};