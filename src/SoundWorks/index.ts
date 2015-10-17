/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

/// <reference path="../../typings/basic.d.ts" />
import SrcSound from './SourceSound';
import BuffSnd from './BufferedSound';
import * as oscillations from './oscillations';
import Osc from './Oscillator';
import BaseSource from './sources/BaseSource';
import VariableSource from './sources/VariableSource';
import SampleSource from './sources/SampleSource';
import MidState from './midi/MidiState';
import MidAdapter from './midi/MidiAdapter';
import MSV from './midi/MidiStateValue';
import * as midiHelpers from './midi/midiHelpers';
import * as cah from './analysis/complexArrayHelpers';
import * as cm from './analysis/complexMath';
import CplxValue from './analysis/complexValue';
import * as xform from './analysis/fourier/transform';
import * as dbels from './analysis/fourier/decibels';
import * as tne from './analysis/fourier/tone';
import WindowFunc from './analysis/fourier/WindowFunction';

export module SoundWorks {
    export var SourceSound = SrcSound;
    export var BufferedSound = BuffSnd;
    export var Oscillator = Osc;
    export module Midi {
        export var MidiState = MidState;
        export var MidiAdapter = MidAdapter;
        export var helpers = midiHelpers;
    }
    export module Source {
        export var Base = BaseSource;
        export var Variable = VariableSource;
        export var Sample = SampleSource;
    }
    export module analysis {
        export module fourier {
            export var transform = xform;
            export var decibels = dbels;
            export var tone = tne;
            export var WindowFunction = WindowFunc;
        }
        export var complexArrayHelpers = cah;
        export var complexMath = cm;
        export var ComplexValue = CplxValue;
    }
    export var OscillatorHelpers = oscillations;
}

(<any>window).soundWorks = SoundWorks;