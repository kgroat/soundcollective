/**
 * Created by kevin on 10/6/15.
 */

var ajax = require('./helpers/ajax');
var makeEventTarget = require('./helpers/makeEventTarget');
var AudioWorkerParam = require('./AudioWorkerParam').new;
var AudioWorkerParamDescriptor = require('./AudioWorkerParamDescriptor').new;

function createWorker(jsString){
    var fullJsString = '' + jsString + '';
    return new Worker(URL.createObjectURL(new Blob([fullJsString], { type: 'text/javascript' })));
}

module.exports = function(global){
    if(typeof global.AudioWorker !== 'undefined'){
        return;
    }

    var shouldThrow = true;

    global.AudioWorker = function PolyfillAudioWorker(options){
        if(shouldThrow){
            throw new Error("Illegal constructor invocation.");
        }

        var self = this;
        var terminated = false;
        var worker = null;
        var parameters = {};
        var url = options.url;
        var context = options.context;

        this.__proto__ = Object.prototype;
        this.onmessage = null;
        this.onerror = null;
        makeEventTarget(this);
        this.__proto__ = global.AudioWorker.prototype;

        var promise = ajax.get(url).then(function(jsString){
            worker = createWorker(jsString);
            worker.onerror = function(ev){
                self.dispatchEvent(ev);
            };
            worker.onmessage = function(ev){
                self.dispatchEvent(ev);
            };
        }, function(err){
            var ev = new Event('error');
            ev.error = err;
            self.dispatchEvent(ev);
        });

        this.terminate = function(){
            if(terminated){
                return;
            }
            terminated = true;
            promise.then(function(){
                worker.terminate();
            });
        };

        this.postMessage = function(message, transfer){
            promise.then(function(){
                worker.postMessage(message, transfer);
            });
        };

        this.createNode = function(numberOfInputs, numberOfOutputs){

        };

        var cachedParams = null;

        Object.defineProperty(this, 'parameters', {
            get: function(){
                if(cachedParams){
                    return cachedParams;
                }
                var output = [];
                for(var key in parameters){
                    if(parameters.hasOwnProperty(key)) {
                        output.push(AudioWorkerParamDescriptor({
                            name: key,
                            defaultValue: parameters[key].defaultValue
                        }));
                    }
                }
                Object.freeze(output);
                cachedParams = output;
                return output;
            }
        });

        this.addParameter = function(name, defaultValue){
            cachedParams = null;
            parameters[name] = AudioWorkerParam({
                defaultValue: defaultValue,
                context: context
            });
        };

        this.removeParameter = function(name){
            cachedParams = null;
            delete parameters[name];
        };

        return this;
    };

    PolyfillAudioWorker.prototype = Object.create(global.Worker);
    Object.defineProperty(PolyfillAudioWorker.prototype, 'constructor', { value: PolyfillAudioWorker });

    module.exports.new = function(options){
        shouldThrow = false;
        var output = new PolyfillAudioWorker(options);
        shouldThrow = true;
        return output;
    };
};
