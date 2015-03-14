var midiBridge = window.midiBridge;

var midiHelpers = require('./midiHelpers');
var MidiState = require('./MidiState');

var adapterList = [];
var midiInitialized = false;
var midi = undefined;
var inputs = [];

var KEY_DOWN = 156;
var KEY_UP = 140;

var setupInputs = function(){
    inputs = midi.inputs();
    inputs[0].onmidimessage = function(ev){
        for(var i in adapterList){
            adapterList[i].fireEvent(ev);
        }
    }
}

var initializeMidi = function(){
    if(midiInitialized){
        return;
    }

    navigator.requestMIDIAccess()
        .then(function(midiAccess) {
            midi = midiAccess;
            setupInputs();
        },
        function(){
            console.log('failed to initialize midi adapter');
        });

    midiInitialized = true;
}

function MidiAdapter(options){
    if(this instanceof MidiAdapter){
        MidiAdapter.init.call(this, options);
        return this;
    } else {
        return new MidiAdapter(options);
    }
}

MidiAdapter.init = function(options){
    options = options || {};
    initializeMidi();

    var setState = undefined;
    var midiState = new MidiState({
        exposeSetter: function(setter){
            setState = setter;
        }
    });

    var callback = options.stateChange || undefined;

    this.onStateChange = function(newCallback){
        callback = newCallback;
    };

    this.offStateChange = function(){
        callback = undefined;
    };

    this.fireEvent = function(event){
        var note = midiHelpers.standardize(event.data[1]);
        var noteValueChange = false;
        var newValue = false;
        if(event.data[0] === KEY_DOWN) {
            newValue = new Date().getTime();
            noteValueChange = true;
        } else if(event.data[0] === KEY_UP) {
            newValue = false;
            noteValueChange = true;
        }
        if(noteValueChange) {
            setState(note, newValue);
            if (typeof callback === 'function') {
                callback(note, newValue);
            }
        }
    };

    Object.defineProperty(this, 'state', { get: function() { return midiState; } });
    Object.defineProperty(this, 'checkState', { get: function() { return midiState.checkState; } });

    adapterList.push(this);
};

Object.freeze(MidiAdapter);

module.exports = MidiAdapter;