var helpers = require('./helpers');
var midiHelpers = require('./midiHelpers');
var MidiState = require('./MidiState');
var Source = require('./Source');
var VariableSource = require('./VariableSource');
var Oscillator = require('./Oscillator');

var sourceOscillator = new Oscillator({ oscillation: Oscillator.oscillations.sine });
var defaultSource = sourceOscillator.getStreamSource();

function MidiSource(options){
    if(this instanceof MidiSource){
        MidiSource.init.call(this, options);
        return this;
    } else {
        return new MidiSource(options);
    }
}

MidiSource.init = function(options){
    if(!options || !(options.midiState instanceof MidiState)){
        throw new Error('A MidiSource requires a MidiState called midiState');
    }
    var self = this;

    var midiState = options.midiState;
    this.sourceSound = options.sourceSound instanceof VariableSource ? options.sourceSound : defaultSource;

    helpers.extend(this, new Source({
        requestData:function(startPoint, length, sampleRate){
            var totalData = undefined;
            var currentState = midiState.getAllOn();
            var voices = 0;
            for(var each in currentState){
                if(currentState.hasOwnProperty(each)){
                    voices++;
                    var singleData = self.sourceSound.requestData(startPoint, length, sampleRate, { frequency: midiHelpers.getFrequency(each) });
                    if(totalData === undefined){
                        totalData = singleData;
                    } else {
                        for(var i in totalData){
                            totalData[i] += singleData[i];
                        }
                    }
                }
            }
            if(!totalData){
                totalData = [];
                for(var i=0; i<length; i++){
                    totalData.push(0);
                }
            }
            if(voices > 1){
                for(var i=0; i<length; i++){
                    totalData[i] /= voices;
                }
            }
            return totalData;
        }
    }));
};

helpers.extend(MidiSource.prototype, Source.prototype);

Object.freeze(MidiSource);

module.exports = MidiSource;