/**
 * Created by kevin on 10/6/15.
 */

// Done?
module.exports = function(global){
    if(typeof global.AudioWorkerParamDescriptor !== 'undefined'){
        return;
    }

    var shouldThrow = true;

    global.AudioWorkerParamDescriptor = function AudioWorkerParamDescriptor(options){
        if(shouldThrow.AudioWorkerParamDescriptor){
            throw new Error("Illegal constructor invocation.");
        }

        Object.defineProperties(this, {
            name: { value: options.name },
            defaultValue: { value: options.defaultValue }
        });

        return this;
    };

    module.exports.new = function(options){
        shouldThrow = false;
        var output = new global.AudioWorker(options);
        shouldThrow = true;
        return output;
    };
};