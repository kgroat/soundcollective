var notes = {
    A_FLAT: 'G#',
    A: 'A',
    A_SHARP: 'A#',
    B_FLAT: 'A#',
    B: 'B',
    B_SHARP: 'C',
    C_FLAT: 'B',
    C: 'C',
    C_SHARP: 'C#',
    D_FLAT: 'C#',
    D: 'D',
    D_SHARP: 'D#',
    E_FLAT: 'D#',
    E: 'E',
    E_SHARP: 'F',
    F_FLAT: 'E',
    F: 'F',
    F_SHARP: 'F#',
    G_FLAT: 'F#',
    G: 'G',
    G_SHARP: 'G#'
};

var midiOrder = [
    notes.C,
    notes.C_SHARP,
    notes.D,
    notes.D_SHARP,
    notes.E,
    notes.F,
    notes.F_SHARP,
    notes.G,
    notes.G_SHARP,
    notes.A,
    notes.A_SHARP,
    notes.B
];

Object.freeze(notes);

var reverseMidiOrder = {
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

var midiNumberToNote = function(number){
    var octave = parseInt(number / 12);
    return midiOrder[number % 12] + ' ' + octave;
};

var noteToMidiNumber = function(note){
    var split = note.split(' ');
    return reverseMidiOrder[split[0]] + parseInt(split[1]) * 12;
};

var standardize = function(value){
    if(isNaN(value)){
        return noteToMidiNumber(value);
    } else {
        return parseInt(value);
    }
};

var getFrequency = function(noteValue){
    noteValue = standardize(noteValue);
    return 440 * Math.pow(2, (noteValue - 57) / 12);
}

var midiHelpers = {
    notes: notes,
    midiNumberToNote: midiNumberToNote,
    noteToMidiNumber: noteToMidiNumber,
    standardize: standardize,
    getFrequency: getFrequency
};

Object.freeze(midiHelpers);

module.exports = midiHelpers;