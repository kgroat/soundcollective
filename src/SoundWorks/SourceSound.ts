/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import VariableSource from './sources/VariableSource';
import GeneratedSound from './GeneratedSound';
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

    constructor(options: { source: VariableSource; }) {
        var genSound = new GeneratedSound();

        Object.defineProperty(this, 'isPlaying', { get: function(){ return genSound.isPlaying; } });

        var source = options.source;

        this.play = function(options: any){
            genSound.play(function(startLoc: number, length: number, sampleRate: number, buffers: number[][]){
                return source.requestData(startLoc, length, sampleRate, buffers, options);
            });
        };

        this.stop = function(){
            genSound.stop();
        };
    }
}

export default SourceSound;