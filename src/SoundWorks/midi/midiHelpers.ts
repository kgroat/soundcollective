/**
 * Created by Kevin on 4/14/2015.
 */

export function midiNumberToNote(midiNumber: number){
    var octave = Math.floor(midiNumber / 12);
    return new MidiNote(midiOrder[midiNumber % 12], octave);
}

export function noteToMidiNumber(note: MidiNote){
    return reverseMidiOrder[note.note] + note.octave * 12;
}

export function standardize(value: any){
    if(value instanceof MidiNote){
        return noteToMidiNumber(value);
    } else {
        return parseInt(value);
    }
}

export function getFrequency(noteValue: MidiNote){
    var midiNumber = standardize(noteValue);
    return 440 * Math.pow(2, (midiNumber - 57) / 12);
}

export class MidiNote {
    note: Root;
    octave: number;
    midiNumber: number

    constructor(note: Root, octave: number){
        Object.defineProperty(this, 'note', { value: note });
        Object.defineProperty(this, 'octave', { value: octave });
        Object.defineProperty(this, 'midiNumber', { value: noteToMidiNumber(this) });
    }
}

export module MidiNote {
    export function fromMidiNumber(midiNumber: number) {
        var root = midiOrder[midiNumber % 12];
        var octave = midiNumber / 12;
        return new MidiNote(root, octave);
    }
}

export enum Root {
    C = 0,
    C_SHARP = 1,
    D_FLAT = Root.C_SHARP,
    D = 2,
    D_SHARP = 3,
    E_FLAT = Root.D_SHARP,
    E = 4,
    E_SHARP = Root.F,
    F_FLAT = Root.E,
    F = 5,
    F_SHARP = 6,
    G_FLAT = Root.F_SHARP,
    G = 7,
    G_SHARP = 8,
    A_FLAT = Root.G_SHARP,
    A = 9,
    A_SHARP = 10,
    B_FLAT = Root.A_SHARP,
    B = 11,
    B_SHARP = Root.C,
    C_FLAT = Root.B,
}

var midiOrder = [
    Root.C,
    Root.C_SHARP,
    Root.D,
    Root.D_SHARP,
    Root.E,
    Root.F,
    Root.F_SHARP,
    Root.G,
    Root.G_SHARP,
    Root.A,
    Root.A_SHARP,
    Root.B
];

var reverseMidiOrder: { [idx: string]: number } = {
    'C': 0,
    'C#': 1,
    'D': 2,
    'D#': 3,
    'E': 4,
    'F': 5,
    'F#': 6,
    'G': 7,
    'G#': 8,
    'A': 9,
    'A#': 10,
    'B': 11
};