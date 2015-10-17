/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import MidiStateValue from './MidiStateValue';

class MidiState {
    checkState: (note: number) => MidiStateValue;
    getAllOn: () => { [idx: string]: MidiStateValue };

    constructor(options: { exposeSetter: (setState: (note: number, value: MidiStateValue) => void) => void }){
        var privateState: { [index: number]: MidiStateValue } = {};

        var setState = function(note: number, value: MidiStateValue){
            if(!value){
                delete  privateState[note];
            }
            privateState[note] = value;
        };

        options.exposeSetter(setState);

        this.checkState = function(note: number){
            if(privateState[note] === undefined){
                privateState[note] = new MidiStateValue(0, 0);
            }
            return privateState[note];
        };

        this.getAllOn = function(){
            var values: { [idx: string]: MidiStateValue } = {};
            for(var note in privateState){
                if(privateState.hasOwnProperty(note) && privateState[note] && privateState[note].value){
                    values[note] = privateState[note];
                }
            }
            return values;
        };
    }
}

export default MidiState;