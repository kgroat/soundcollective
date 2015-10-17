/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import VariableSource from './sources/VariableSource';
import * as osc from './oscillations';

class Oscillator {
    getStreamSource: (hertz: number) => VariableSource;
    oscillation: (time: number, hertz: number) => number;

    constructor(options: { oscillation: (time: number, hertz: number) => number }){
        var oscillation = options.oscillation || osc.oscillations.sine;
        Object.defineProperty(this, 'oscillation', { value: oscillation });
        this.getStreamSource = function(hertz: number){
            return new VariableSource({
                data: { frequency: hertz },
                expectedData: ['frequency'],
                requestData: function(startPoint, length, sampleRate, options){
                    sampleRate = sampleRate || 44100;
                    var startTime = startPoint / sampleRate;
                    var data: number[] = [];
                    for(var i=0; i<length; i++){
                        data.push(oscillation(startTime + (i / sampleRate), options.frequency));
                    }
                    return data;
                }
            });
        };
    }
}

module Oscillator {
    export var oscillations = osc.oscillations;
    export var filters = osc.filters;
    export var plate = osc.plate;
}

export default Oscillator;