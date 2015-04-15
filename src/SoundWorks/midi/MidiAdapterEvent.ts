/**
 * Created by Kevin on 4/14/2015.
 */
import MSV = require('./MidiStateValue');
import MidAd = require('./MidiAdapter');

import MidiStateValue = MSV.MidiStateValue;
import MidiAdapter = MidAd.MidiAdapter;

export class MidiAdapterEvent {
    note: number;
    state: MidiStateValue;
    adapter: MidiAdapter;

    constructor(note: number, state: MidiStateValue, adapter: MidiAdapter) {
        Object.defineProperty(this, 'note', { value: note });
        Object.defineProperty(this, 'state', { value: state });
        Object.defineProperty(this, 'adapter', { value: adapter });
    }
}