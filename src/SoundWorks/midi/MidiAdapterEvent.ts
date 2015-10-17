/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import MidiStateValue from './MidiStateValue';
import MidiAdapter from './MidiAdapter';

class MidiAdapterEvent {
    note: number;
    state: MidiStateValue;
    adapter: MidiAdapter;

    constructor(note: number, state: MidiStateValue, adapter: MidiAdapter) {
        Object.defineProperty(this, 'note', { value: note });
        Object.defineProperty(this, 'state', { value: state });
        Object.defineProperty(this, 'adapter', { value: adapter });
    }
}

export default MidiAdapterEvent;