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
    var delay = options.delay || 0.1;
    var bufferCount = options.bufferCount || 3;

    var bufferSize = parseInt(delay * 44100);
    var fullBufferSize = bufferSize * bufferCount;

    var buffer = context.createBuffer(1, fullBufferSize, 44100);

    var gainNode = context.createGain();
    gainNode.connect(context.destination);

    var currentFrame = 0;
    var bufferSource = undefined;

    var timeoutId = 0;
    var lastTime = 0;
    var startTime = 0;

    var isPlaying = false;
    Object.defineProperty(this, 'isPlaying', { get: function() { return isPlaying; } });

    var fillBuffer = function(startingFrame, length, options){
        var channelData = buffer.getChannelData(0);
        var newData = source.requestData(startingFrame, length, 44100, options);
        for(var i=0; i<newData.length; i++){
            channelData[(i + startingFrame) % channelData.length] = newData[i];
        }
    };

    var createBufferSource = function(){
        var output = context.createBufferSource();
        output.buffer = buffer;
        output.loop = true;
        output.connect(gainNode);
        return output;
    };

    var framesElapsed = function(start, end){
        var startFrame = Math.round(start * 44100);
        var endFrame = Math.round(end * 44100);
        return endFrame - startFrame;
    };

    this.play = function(options){
        options = options || {};
        currentFrame = fullBufferSize - (bufferSize / 2);
        fillBuffer(0, fullBufferSize, options);
        var expectedMs = delay * 1000;
        var maxErr = expectedMs * 0.2;
        var minErr = expectedMs * -0.2;
        var timeoutFunc = function(){
            var currentTime = context.currentTime;
            var diffFrames = framesElapsed(lastTime, currentTime);
            var diffTime = currentTime - lastTime;
            lastTime = currentTime;
            if(diffFrames < fullBufferSize) {
                fillBuffer(currentFrame, diffFrames, options);
            } else {
                currentFrame += diffFrames - fullBufferSize;
                fillBuffer(currentFrame, fullBufferSize, options);
            }
            currentFrame += diffFrames;
            var actualMs = diffTime * 1000;
            var errMs = Math.max(minErr, Math.min(actualMs - expectedMs, maxErr));
            timeoutId = setTimeout(timeoutFunc, expectedMs - errMs * 0.9 )
        };
        timeoutId = window.setTimeout(timeoutFunc, delay * 1000 - 10);
        bufferSource = createBufferSource();
        isPlaying = true;
        lastTime = startTime = context.currentTime;
        bufferSource.start();
    };

    this.stop = function(){
        isPlaying = false;
        window.clearTimeout(timeoutId);
        timeoutId = 0;
        bufferSource.stop();
    }
};

Object.freeze(SourceSound);

module.exports = SourceSound;