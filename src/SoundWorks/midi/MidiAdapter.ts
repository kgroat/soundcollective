/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import MidiState from './MidiState';
import MidiStateValue from './MidiStateValue';
import MidiAdapterEvent from './MidiAdapterEvent';
import * as sma from './SingletonMidiAccess';

var adapterList: MidiAdapter[] = [];
var midi: any; //MIDIAccess
var inputs: any; //MIDIInputMap

var KEY_DOWN = 156;
var KEY_UP = 140;

sma.promise.then(function(){
    midi = sma.midi;
    inputs = midi.inputs;
    var first = inputs.get(0);
    if(first){
        first.onmidimessage = function(ev: any /* MIDIMessageEvent */){
            for(var i in adapterList){
                adapterList[i].fireEvent(ev);
            }
        };
    }
});

class MidiAdapter {
    onstatechange: (ev: any /* MIDIMessageEvent */) => any;
    fireEvent: (ev: any /* MIDIMessageEvent */) => void;
    state: MidiState;

    constructor(options: { onstatechange?: (ev: MidiAdapterEvent) => any }) {
        var setState: (note: number, value: MidiStateValue) => void;
        var midiState = new MidiState({
            exposeSetter: function(setter: (note: number, value: MidiStateValue) => void){
                setState = setter;
            }
        });

        if(typeof options.onstatechange === 'function') {
            this.onstatechange = options.onstatechange;
        }

        this.fireEvent = function(event: any /* MIDIMessageEvent */){
            var noteNumber = event.data[1];
            var noteValueChange = false;
            var receivedTime: number;
            var newState: number;
            if(event.data[0] === KEY_DOWN) {
                receivedTime = event.receivedTime;
                noteValueChange = true;
                newState = 0;
            } else if(event.data[0] === KEY_UP) {
                receivedTime = 0;
                noteValueChange = true;
                newState = event.data[2];
            }
            if(noteValueChange) {
                var state = new MidiStateValue(receivedTime, newState);
                setState(noteNumber, state);
                if (typeof this.onstatechange === 'function') {
                    this.onstatechange(new MidiAdapterEvent(noteNumber, state, this));
                }
            }
        };

        Object.defineProperty(this, 'state', { value: midiState });

        adapterList.push(this);
    }
}

export default MidiAdapter;