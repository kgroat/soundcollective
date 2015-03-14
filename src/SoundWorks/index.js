/*jslint node: true*/
module.exports = window.soundWorks = {
    BufferedSound: require('./BufferedSound'),
    SourceSound: require('./SourceSound2'),
    Oscillator: require('./Oscillator'),
    MidiState: require('./MidiState'),
    MidiAdapter: require('./MidiAdapter'),
    Source: {
        Base: require('./Source'),
        Variable: require('./VariableSource'),
        Sample: require('./SampleSource'),
        Midi: require('./MidiSource')
    }
};