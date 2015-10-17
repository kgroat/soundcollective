/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

class MidiStateValue {
    time: number;
    value: number;

    constructor(time: number, value: number) {
        Object.defineProperty(this, 'time', { value: time });
        Object.defineProperty(this, 'value', { value: value });
    }
}

export default MidiStateValue;