var context = require('./SingletonAudioContext');
var SampleSource = require('./SampleSource');

function BufferedSound(options){
    if(this instanceof BufferedSound){
        BufferedSound.init.call(this, options);
        return this;
    } else {
        return new BufferedSound(options);
    }
}

BufferedSound.init = function(options){
    options = options || {};
    options.duration = options.duration || 1;

    var buffer = context.createBuffer(1, parseInt(options.duration * 44100), 44100);
    var gainNode = context.createGain();
    gainNode.connect(context.destination);
    var source = undefined;

    this.duration = buffer.duration;
    this.length = buffer.length;
    this.sampleRate = buffer.sampleRate;

    Object.defineProperty(this, 'volume', { get: function() { return gainNode.gain.value; }, set: function(val) { return gainNode.gain.value = val; } });
    Object.defineProperty(this, 'isPlaying', { get: function() { return source !== undefined; } });

    function createSource (){
        source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        return source;
    }

    this.loop = function(){
        this.stop();
        var mySource = createSource();
        mySource.loop = true;
        mySource.start();
    };

    this.stop = function(){
        if(source !== undefined){
            source.stop();
            source = undefined;
        }
    }

    this.loopEnqueue = function(data, startIndex, bufferStartIndex, length){
        var channelData = buffer.getChannelData(0);
        startIndex = startIndex || 0;
        bufferStartIndex = bufferStartIndex || 0;
        length = length || data.length - startIndex;
        for(var i=0; i<length; i++){
            var dataIndex = (i + startIndex)%data.length;
            var bufferIndex = (i + bufferStartIndex)%buffer.length;
            channelData[bufferIndex] = data[dataIndex];
        }
    }

    this.enqueue = function(data, startIndex, bufferStartIndex, length){
        var channelData = buffer.getChannelData(0);
        startIndex = startIndex || 0;
        bufferStartIndex = bufferStartIndex || 0;
        length = length || data.length - startIndex;

        if(startIndex + length > data.length){
            console.error('Index ' + (startIndex + length) + ' falls outside of the bounds of the input data.');
        }
        if(bufferStartIndex + length > buffer.length){
            console.error('Index ' + (bufferStartIndex + length) + ' falls outside of the bounds of the buffer data.');
        }
        if(startIndex + length > data.length || bufferStartIndex + length > channelData.length){
            return;
        }

        for(var i=0; i<length; i++){
            var dataIndex = i + startIndex;
            var bufferIndex = i + bufferStartIndex;
            channelData[bufferIndex] = data[dataIndex];
        }
    }
};

Object.freeze(BufferedSound);

module.exports = BufferedSound;