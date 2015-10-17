/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import VariableSource from './sources/VariableSource';
import context from './SingletonAudioContext';

var oneSecInMs = 1000;

var defaultDelay = 0.1;
var defaultBufferCount = 3;
var defaultSampleRate = 44100;


//TODO: make default channel count 2
var defaultChannelCount = 1;

class SourceSound {
    play: (options: any) => void;
    stop: () => void;
    isPlaying: boolean;

    constructor(options: { /*source: VariableSource;*/ source: any; delay?: number; bufferCount?: number; sampleRate?: number; }) {
        if((typeof options.delay !== "number" && typeof options.delay !== "undefined") || (typeof options.delay === "number" && options.delay <= 0)){
            throw new Error("If a delay is supplied, it must be a positive number");
        }

        var source = options.source;
        var delay = options.delay || defaultDelay;
        var bufferCount = options.bufferCount || defaultBufferCount;
        var sampleRate = options.sampleRate || defaultSampleRate;

        //TODO: make channelCount variable based on constructor input
        var channelCount = defaultChannelCount;

        var bufferSize = Math.floor(delay * sampleRate);
        var fullBufferSize = bufferSize * bufferCount;

        var buffer = context.createBuffer(channelCount, fullBufferSize, sampleRate);

        var gainNode = context.createGain();
        gainNode.connect(context.destination);

        var currentFrame = 0;
        var bufferSource: AudioBufferSourceNode;

        var timeoutId = 0;
        var lastTime = 0;
        var startTime = 0;

        var isPlaying = false;
        this.isPlaying = isPlaying;
        //Object.defineProperty(this, 'isPlaying', { get: function() { return isPlaying; } });

        var fillBuffer = function(startingFrame: number, length: number, options: any, channel?: number){
            channel = channel || 0;
            var channelData = buffer.getChannelData(channel);
            var newData = source.requestData(startingFrame, length, sampleRate, options);
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

        var framesElapsed = function(start: number, end: number){
            var startFrame = Math.round(start * sampleRate);
            var endFrame = Math.round(end * sampleRate);
            return endFrame - startFrame;
        };

        this.play = function(options: {}){
            currentFrame = fullBufferSize - (bufferSize / 2);
            fillBuffer(0, fullBufferSize, options);
            var expectedMs = delay * oneSecInMs;
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
                var actualMs = diffTime * oneSecInMs;
                var errMs = Math.max(minErr, Math.min(actualMs - expectedMs, maxErr));
                timeoutId = setTimeout(timeoutFunc, expectedMs - errMs * 0.9 )
            };
            timeoutId = window.setTimeout(timeoutFunc, delay * oneSecInMs - 10);
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
        };
    }
}

export default SourceSound;