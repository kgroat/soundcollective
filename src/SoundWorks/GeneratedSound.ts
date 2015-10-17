/**
 * Created by kevin on 10/16/15.
 */
'use strict';

import context from './SingletonAudioContext';

class GeneratedSound {
    duration: number;
    length: number;
    sampleRate: number;
    volume: number;
    isPlaying: boolean;
    play: (generator: (startLoc: number, length: number, sampleFrequency: number, buffers: number[][]) => boolean) => void;
    stop: () => void;

    constructor(options?: { duration?: number }) {
        options = options || {};
        options.duration = options.duration || 1;
        var startTime = -1;
        var buffer = context.createBuffer(1, Math.floor(options.duration * 44100), 44100);
        var getSound: (startLoc: number, length: number, sampleFrequency: number, buffers: number[][]) => boolean;
        var shouldStop = false;
        this.duration = buffer.duration;
        this.length = buffer.length;
        this.sampleRate = buffer.sampleRate;

        var source: AudioBufferSourceNode;
        var processor: ScriptProcessorNode;
        var gainNode = context.createGain();
        gainNode.connect(context.destination);

        Object.defineProperty(this, 'volume', { get: function() { return gainNode.gain.value; }, set: function(val) { return gainNode.gain.value = val; } });
        Object.defineProperty(this, 'isPlaying', { get: function() { return source !== undefined; } });

        function createSource (){
            source = context.createBufferSource();
            source.buffer = buffer;
            processor = context.createScriptProcessor(256, 1, 1);
            processor.onaudioprocess = function(evt: AudioProcessingEvent){
                if(shouldStop){ return stop() }
                var output = evt.outputBuffer;
                if(startTime < 0){
                    startTime = evt.playbackTime;
                }
                var startLocation = (evt.playbackTime - startTime) * buffer.sampleRate;
                var buffers: number[][] = [];
                for(var i=0; i<output.numberOfChannels; i++){
                    buffers.push(output.getChannelData(i));
                }
                var length = buffers[0].length;
                shouldStop = getSound(startLocation, length, buffer.sampleRate, buffers);
            };
            source.connect(processor);
            processor.connect(gainNode);
            return source;
        }

        function play(generator: (startLoc: number, length: number, sampleFrequency: number, buffers: number[][]) => boolean){
            if(typeof generator != "function"){
                throw Error('generator must be a function!');
            }
            startTime = -1;
            shouldStop = false;
            getSound = generator;

            if(source === undefined){
                var mySource = createSource();
                mySource.loop = true;
                mySource.start();
            }
        }
        this.play = play;

        function stop(){
            if(source !== undefined){
                source.stop();
                processor.disconnect();
                source = undefined;
            }
        }
        this.stop = stop;
    }
}

export default GeneratedSound;