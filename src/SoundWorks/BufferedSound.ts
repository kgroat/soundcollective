/**
 * Created by Kevin on 4/14/2015.
 */
import sac = require('./SingletonAudioContext');

var context = sac.context;

export class BufferedSound {
    duration: number;
    length: number;
    sampleRate: number;
    volume: number;
    isPlaying: boolean;
    loop: () => void;
    stop: () => void;
    loopEnqueue: (data: number[], startIndex?: number, bufferStartIndex?: number, length?: number) => void;
    enqueue: (data: number[], startIndex?: number, bufferStartIndex?: number, length?: number) => void;

    constructor(public options: { duration?: number }) {
        options = options || {};
        options.duration = options.duration || 1;

        var buffer = context.createBuffer(1, Math.floor(options.duration * 44100), 44100);
        var gainNode = context.createGain();
        gainNode.connect(context.destination);
        var source: AudioBufferSourceNode;

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

        this.loopEnqueue = function(data: number[], startIndex = 0, bufferStartIndex = 0, length = 0){
            var channelData = buffer.getChannelData(0);
            length = length || data.length - startIndex;
            for(var i=0; i<length; i++){
                var dataIndex = (i + startIndex)%data.length;
                var bufferIndex = (i + bufferStartIndex)%buffer.length;
                channelData[bufferIndex] = data[dataIndex];
            }
        }

        this.enqueue = function(data: number[], startIndex = 0, bufferStartIndex = 0, length = 0){
            var channelData = buffer.getChannelData(0);
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
    }
}