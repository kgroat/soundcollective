/**
 * Created by kevin on 10/6/15.
 */

module.exports = function(global){
    if(typeof global.AudioWorkerNode !== 'undefined'){
        return;
    }

    var shouldThrow = true;

    global.AudioWorkerNode = function PolyfillAudioWorkerNode(options){
        if(shouldThrow){
            throw new Error("Illegal constructor invocation.");
        }

        return this;
    };

    PolyfillAudioWorkerNode.prototype = Object.create(AudioNode.prototype);
    Object.defineProperty(PolyfillAudioWorkerNode.prototype, 'constructor', { value: PolyfillAudioWorkerNode });

    module.exports.new = function(options){
        shouldThrow = false;
        var output = new PolyfillAudioWorkerNode(options);
        shouldThrow = true;
        return output;
    };
};