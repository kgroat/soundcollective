/**
 * Created by Kevin on 4/14/2015.
 */
import VariableSource = require('./sources/VariableSource');
import osc = require('./oscillations');

export class Oscillator {
    getStreamSource: (hertz: number) => VariableSource.VariableSource;
    oscillation: (time: number, hertz: number) => number;

    constructor(options: { oscillation: (time: number, hertz: number) => number }){
        var oscillation = options.oscillation || osc.oscillations.sine;
        Object.defineProperty(this, 'oscillation', { value: oscillation });
        this.getStreamSource = function(hertz: number){
            return new VariableSource.VariableSource({
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