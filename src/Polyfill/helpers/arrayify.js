/**
 * Created by kevin on 10/9/15.
 */

module.exports = arrayify;

function arrayify(op, arrayIndex, thisArg){
    thisArg = thisArg || this;
    return function(){
        if(isArrayLike(arguments[arrayIndex])){
            var arr = arguments[arrayIndex];
            return arr.map(function(item) {
                arguments[arrayIndex] = item;
                return op.apply(thisArg, arguments);
            });
        } else {
            return op.apply(thisArg, arguments);
        }
    }
}

function isArrayLike(arr){
    return typeof arr.length === 'number' && arr.slice === Array.prototype.slice
}