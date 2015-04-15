/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../typings/basic.d.ts" />
import SrcSnd = require('./SourceSound');
import BuffSnd = require('./BufferedSound');
import osc = require('./oscillations');
import Osc = require('./Oscillator');
import Src = require('./sources/Source');
import VarSrc = require('./sources/VariableSource');
import SplSrc = require('./sources/SampleSource');
import MidSt = require('./midi/MidiState');
import MidAd = require('./midi/MidiAdapter');
import MSV = require('./midi/MidiStateValue');
import midiHelpers = require('./midi/midiHelpers');

export module SoundWorks {
    export import SourceSound = SrcSnd.SourceSound;
    export import BufferedSound = BuffSnd.BufferedSound;
    export import Oscillator = Osc.Oscillator;
    export module Midi {
        export import MidiState = MidSt.MidiState;
        export import MidiAdapter = MidAd.MidiAdapter;
        export import helpers = midiHelpers;
    }
    export module Source {
        export import Base = Src.Source;
        export import Variable = VarSrc.VariableSource;
        export import Sample = SplSrc.SampleSource;
    }
    export module OscillatorHelpers {
        export import oscillations = osc.oscillations;
        export import filters = osc.filters;
        export import plate = osc.plate;
    }
}

window.soundWorks = SoundWorks;