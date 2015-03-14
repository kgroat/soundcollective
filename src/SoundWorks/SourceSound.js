var Source = require('./Source');
var VariableSource = require('./VariableSource');
var context = require('./SingletonAudioContext');

function SourceSound(options){
    if(this instanceof SourceSound){
        SourceSound.init.call(this, options);
        return this;
    } else {
        return new SourceSound(options);
    }
}

SourceSound.init = function(options){
    if(!options){
        throw new Error("SourceSound requires an options hash to be passed in, with a SourceSound named source");
    }

    if(!(options.source instanceof VariableSource)){
        throw new Error("SourceSound requires a SoundSource named source");
    }

    if((typeof options.delay !== "number" && typeof options.delay !== "undefined") || (typeof options.delay === "number" && options.delay <= 0)){
        throw new Error("If a delay is supplied, it must be a positive number");
    }

    var source = options.source;
    var delay = options.delay || 0.5;
    var buffersToUse = 2;

    var bufferSize = parseInt(delay * 44100)

    var buffers = [];
    var allocateBuffers = function(count){
        for(var i=buffers.length; i<count; i++){
            buffers.push(context.createBuffer(1, bufferSize, 44100));
        }
    }
    allocateBuffers(2);

    var channelData = [];
    channelData[0] = buffers[0].getChannelData(0);
    channelData[1] = buffers[1].getChannelData(0);
    var gainNode = context.createGain();
    gainNode.connect(context.destination);

    var currentFrame = 0;
    var bufferSource = undefined;
    var nextBufferSource = undefined;
    var isPlaying = false;
    Object.defineProperty(this, 'isPlaying', { get: function() { return isPlaying; } });

    var allocateBuffers = function(count){
        for(var i=buffers.length; i<count; i++){
            buffers.push(context.createBuffer(1, bufferSize, 44100));
        }
    };

    var fillBuffer = function(index, startingFrame, options){
        var localData = channelData[index];
        var newData = source.requestData(startingFrame, bufferSize, 44100, options);
        for(var i=0; i<localData.length; i++){
            localData[i] = newData[i];
        }
    };

    var createBufferSource = function(index, options){
        var output = context.createBufferSource();
        output.buffer = buffers[index];
        output.connect(gainNode);
        output.onended = (function(){
            if(nextBufferSource) {
                bufferSource = nextBufferSource;
                bufferSource.start();
                nextBufferSource = createBufferSource((index + 2) % buffersToUse, options);
                fillBuffer(index, currentFrame, options);
                currentFrame += bufferSize;
            }
        });
        return output;
    };

    this.play = function(options){
        options = options || {};
        var bufferCount = options.bufferCount || 2;
        allocateBuffers(bufferCount);
        buffersToUse = bufferCount;
        currentFrame = 0;
        for(var i=0; i<bufferCount; i++){
            fillBuffer(i, currentFrame, options);
            currentFrame += bufferSize;
        }
        bufferSource = createBufferSource(0, options);
        nextBufferSource = createBufferSource(1, options);
        isPlaying = true;
        bufferSource.start();
    };

    this.stop = function(){
        nextBufferSource = null;
        isPlaying = false;
        bufferSource.stop();
    }
};

Object.freeze(SourceSound);

module.exports = SourceSound;