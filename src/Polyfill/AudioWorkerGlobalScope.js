/**
 * Created by kevin on 10/6/15.
 */

// TODO: figure out how to create this inside of the worker
module.exports = function(global){
    if(typeof global.AudioWorkerGlobalScope !== 'undefined'){
        return;
    }

    var shouldThrow = true;

    global.AudioWorkerGlobalScope = function PolyfillAudioWorkerGlobalScope(options){
        if(shouldThrow){
            throw new Error("Illegal constructor invocation.");
        }
        var terminated = false;

        return this;
    };

    PolyfillAudioWorkerGlobalScope.prototype = Object.create(global.Worker);
    Object.defineProperty(PolyfillAudioWorkerGlobalScope.prototype, 'constructor', { value: PolyfillAudioWorkerGlobalScope });

    module.exports.new = function(options){
        shouldThrow = false;
        var output = new PolyfillAudioWorkerGlobalScope(options);
        shouldThrow = true;
        return output;
    };
};
