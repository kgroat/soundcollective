/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import BaseSource from './BaseSource';

class SampleSource extends BaseSource {

    constructor(options: { sample: number[][]; repeat: boolean; }){
        var samples = options.sample;
        var repeat = options.repeat;

        var requestData: (startPoint: number, length: number, sampleRate: number, buffers: number[][], options?: any) => boolean;
        if(repeat){
            requestData = function(startPoint: number, length: number, sampleRate: number, buffers: number[][]) {
                for (var i=0; i<buffers.length; i++) {
                    let buffer = buffers[i];
                    let sample = samples[i];
                    for (var j=0; j<length; j++) {
                        buffer[j] = sample[(j + startPoint) % sample.length];
                    }
                }
                return false;
            };
        } else {
            requestData = function(startPoint: number, length: number, sampleRate: number, buffers: number[][]){
                var hasEnded = true;
                for (var i=0; i<buffers.length; i++) {
                    let buffer = buffers[i];
                    let sample = samples[i];
                    for (var j=0; j<length; j++) {
                        buffer[j] = sample[(j + startPoint)] || 0;
                    }
                    hasEnded = hasEnded && (startPoint + length > sample.length)
                }
                return hasEnded;
            };
        }

        super({ requestData: requestData });
    }
}

export default SampleSource;