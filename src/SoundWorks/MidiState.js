var midiHelpers = require('./midiHelpers');

function MidiState(options){
    if(this instanceof MidiState){
        MidiState.init.call(this, options);
        return this;
    } else {
        return new MidiState(options);
    }
}

MidiState.init = function(options){
    options = options || {};
    var privateState = {};
    var setState = function(note, value){
        note = midiHelpers.standardize(note);
        if(!value){
            delete  privateState[note];
        }
        privateState[note] = value;
    };

    if(typeof options.exposeSetter === 'function'){
        options.exposeSetter(setState);
    }

    this.checkState = function(note){
        note = midiHelpers.standardize(note);
        return privateState[note] || false;
    }

    this.getAllOn = function(){
        var values = {};
        for(var note in privateState){
            if(privateState.hasOwnProperty(note) && privateState[note]){
                values[note] = privateState[note];
            }
        }
        return values;
    }
};

Object.freeze(MidiState);

module.exports = MidiState;