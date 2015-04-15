(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var sac = require('./SingletonAudioContext');
var context = sac.context;
var BufferedSound = (function () {
    function BufferedSound(options) {
        this.options = options;
        options = options || {};
        options.duration = options.duration || 1;
        var buffer = context.createBuffer(1, Math.floor(options.duration * 44100), 44100);
        var gainNode = context.createGain();
        gainNode.connect(context.destination);
        var source;
        this.duration = buffer.duration;
        this.length = buffer.length;
        this.sampleRate = buffer.sampleRate;
        Object.defineProperty(this, 'volume', { get: function () {
            return gainNode.gain.value;
        }, set: function (val) {
            return gainNode.gain.value = val;
        } });
        Object.defineProperty(this, 'isPlaying', { get: function () {
            return source !== undefined;
        } });
        function createSource() {
            source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(gainNode);
            return source;
        }
        this.loop = function () {
            this.stop();
            var mySource = createSource();
            mySource.loop = true;
            mySource.start();
        };
        this.stop = function () {
            if (source !== undefined) {
                source.stop();
                source = undefined;
            }
        };
        this.loopEnqueue = function (data, startIndex, bufferStartIndex, length) {
            if (startIndex === void 0) { startIndex = 0; }
            if (bufferStartIndex === void 0) { bufferStartIndex = 0; }
            if (length === void 0) { length = 0; }
            var channelData = buffer.getChannelData(0);
            length = length || data.length - startIndex;
            for (var i = 0; i < length; i++) {
                var dataIndex = (i + startIndex) % data.length;
                var bufferIndex = (i + bufferStartIndex) % buffer.length;
                channelData[bufferIndex] = data[dataIndex];
            }
        };
        this.enqueue = function (data, startIndex, bufferStartIndex, length) {
            if (startIndex === void 0) { startIndex = 0; }
            if (bufferStartIndex === void 0) { bufferStartIndex = 0; }
            if (length === void 0) { length = 0; }
            var channelData = buffer.getChannelData(0);
            length = length || data.length - startIndex;
            if (startIndex + length > data.length) {
                console.error('Index ' + (startIndex + length) + ' falls outside of the bounds of the input data.');
            }
            if (bufferStartIndex + length > buffer.length) {
                console.error('Index ' + (bufferStartIndex + length) + ' falls outside of the bounds of the buffer data.');
            }
            if (startIndex + length > data.length || bufferStartIndex + length > channelData.length) {
                return;
            }
            for (var i = 0; i < length; i++) {
                var dataIndex = i + startIndex;
                var bufferIndex = i + bufferStartIndex;
                channelData[bufferIndex] = data[dataIndex];
            }
        };
    }
    return BufferedSound;
})();
exports.BufferedSound = BufferedSound;

},{"./SingletonAudioContext":3}],2:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var VariableSource = require('./sources/VariableSource');
var osc = require('./oscillations');
var Oscillator = (function () {
    function Oscillator(options) {
        var oscillation = options.oscillation || osc.oscillations.sine;
        Object.defineProperty(this, 'oscillation', { value: oscillation });
        this.getStreamSource = function (hertz) {
            return new VariableSource.VariableSource({
                data: { frequency: hertz },
                expectedData: ['frequency'],
                requestData: function (startPoint, length, sampleRate, options) {
                    sampleRate = sampleRate || 44100;
                    var startTime = startPoint / sampleRate;
                    var data = [];
                    for (var i = 0; i < length; i++) {
                        data.push(oscillation(startTime + (i / sampleRate), options.frequency));
                    }
                    return data;
                }
            });
        };
    }
    return Oscillator;
})();
exports.Oscillator = Oscillator;

},{"./oscillations":12,"./sources/VariableSource":15}],3:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../typings/tsd.d.ts" />
AudioContext = AudioContext || webkitAudioContext;
exports.context = new AudioContext();

},{}],4:[function(require,module,exports){
var sac = require('./SingletonAudioContext');
const context = sac.context;
const oneSecInMs = 1000;
const defaultDelay = 0.1;
const defaultBufferCount = 3;
const defaultSampleRate = 44100;
//TODO: make default channel count 2
const defaultChannelCount = 1;
var SourceSound = (function () {
    function SourceSound(options) {
        if ((typeof options.delay !== "number" && typeof options.delay !== "undefined") || (typeof options.delay === "number" && options.delay <= 0)) {
            throw new Error("If a delay is supplied, it must be a positive number");
        }
        var source = options.source;
        var delay = options.delay || defaultDelay;
        var bufferCount = options.bufferCount || defaultBufferCount;
        var sampleRate = options.sampleRate || defaultSampleRate;
        //TODO: make channelCount variable based on constructor input
        var channelCount = defaultChannelCount;
        var bufferSize = Math.floor(delay * sampleRate);
        var fullBufferSize = bufferSize * bufferCount;
        var buffer = context.createBuffer(channelCount, fullBufferSize, sampleRate);
        var gainNode = context.createGain();
        gainNode.connect(context.destination);
        var currentFrame = 0;
        var bufferSource;
        var timeoutId = 0;
        var lastTime = 0;
        var startTime = 0;
        var isPlaying = false;
        Object.defineProperty(this, 'isPlaying', { get: function () {
            return isPlaying;
        } });
        var fillBuffer = function (startingFrame, length, options, channel) {
            if (channel === void 0) { channel = 0; }
            var channelData = buffer.getChannelData(channel);
            var newData = source.requestData(startingFrame, length, sampleRate, options);
            for (var i = 0; i < newData.length; i++) {
                channelData[(i + startingFrame) % channelData.length] = newData[i];
            }
        };
        var createBufferSource = function () {
            var output = context.createBufferSource();
            output.buffer = buffer;
            output.loop = true;
            output.connect(gainNode);
            return output;
        };
        var framesElapsed = function (start, end) {
            var startFrame = Math.round(start * sampleRate);
            var endFrame = Math.round(end * sampleRate);
            return endFrame - startFrame;
        };
        this.play = function (options) {
            currentFrame = fullBufferSize - (bufferSize / 2);
            fillBuffer(0, fullBufferSize, options);
            var expectedMs = delay * oneSecInMs;
            var maxErr = expectedMs * 0.2;
            var minErr = expectedMs * -0.2;
            var timeoutFunc = function () {
                var currentTime = context.currentTime;
                var diffFrames = framesElapsed(lastTime, currentTime);
                var diffTime = currentTime - lastTime;
                lastTime = currentTime;
                if (diffFrames < fullBufferSize) {
                    fillBuffer(currentFrame, diffFrames, options);
                }
                else {
                    currentFrame += diffFrames - fullBufferSize;
                    fillBuffer(currentFrame, fullBufferSize, options);
                }
                currentFrame += diffFrames;
                var actualMs = diffTime * oneSecInMs;
                var errMs = Math.max(minErr, Math.min(actualMs - expectedMs, maxErr));
                timeoutId = setTimeout(timeoutFunc, expectedMs - errMs * 0.9);
            };
            timeoutId = window.setTimeout(timeoutFunc, delay * oneSecInMs - 10);
            bufferSource = createBufferSource();
            isPlaying = true;
            lastTime = startTime = context.currentTime;
            bufferSource.start();
        };
        this.stop = function () {
            isPlaying = false;
            window.clearTimeout(timeoutId);
            timeoutId = 0;
            bufferSource.stop();
        };
    }
    return SourceSound;
})();
exports.SourceSound = SourceSound;

},{"./SingletonAudioContext":3}],5:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../typings/basic.d.ts" />
var SrcSnd = require('./SourceSound');
var BuffSnd = require('./BufferedSound');
var osc = require('./oscillations');
var Osc = require('./Oscillator');
var Src = require('./sources/Source');
var VarSrc = require('./sources/VariableSource');
var SplSrc = require('./sources/SampleSource');
var MidSt = require('./midi/MidiState');
var MidAd = require('./midi/MidiAdapter');
var midiHelpers = require('./midi/midiHelpers');
var SoundWorks;
(function (SoundWorks) {
    SoundWorks.SourceSound = SrcSnd.SourceSound;
    SoundWorks.BufferedSound = BuffSnd.BufferedSound;
    SoundWorks.Oscillator = Osc.Oscillator;
    var Midi;
    (function (Midi) {
        Midi.MidiState = MidSt.MidiState;
        Midi.MidiAdapter = MidAd.MidiAdapter;
        Midi.helpers = midiHelpers;
    })(Midi = SoundWorks.Midi || (SoundWorks.Midi = {}));
    var Source;
    (function (Source) {
        Source.Base = Src.Source;
        Source.Variable = VarSrc.VariableSource;
        Source.Sample = SplSrc.SampleSource;
    })(Source = SoundWorks.Source || (SoundWorks.Source = {}));
    var OscillatorHelpers;
    (function (OscillatorHelpers) {
        OscillatorHelpers.oscillations = osc.oscillations;
        OscillatorHelpers.filters = osc.filters;
        OscillatorHelpers.plate = osc.plate;
    })(OscillatorHelpers = SoundWorks.OscillatorHelpers || (SoundWorks.OscillatorHelpers = {}));
})(SoundWorks = exports.SoundWorks || (exports.SoundWorks = {}));
window.soundWorks = SoundWorks;

},{"./BufferedSound":1,"./Oscillator":2,"./SourceSound":4,"./midi/MidiAdapter":6,"./midi/MidiState":8,"./midi/midiHelpers":11,"./oscillations":12,"./sources/SampleSource":13,"./sources/Source":14,"./sources/VariableSource":15}],6:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var MidSt = require('./MidiState');
var MSV = require('./MidiStateValue');
var MAE = require('./MidiAdapterEvent');
var sma = require('./SingletonMidiAccess');
var MidiState = MidSt.MidiState;
var MidiStateValue = MSV.MidiStateValue;
var MidiAdapterEvent = MAE.MidiAdapterEvent;
var adapterList = [];
var midi;
var inputs;
var KEY_DOWN = 156;
var KEY_UP = 140;
sma.promise.then(function () {
    midi = sma.midi;
    inputs = midi.inputs;
    inputs.get(0).onmidimessage = function (ev) {
        for (var i in adapterList) {
            adapterList[i].fireEvent(ev);
        }
    };
});
var MidiAdapter = (function () {
    function MidiAdapter(options) {
        var setState;
        var midiState = new MidiState({
            exposeSetter: function (setter) {
                setState = setter;
            }
        });
        if (typeof options.onstatechange === 'function') {
            this.onstatechange = options.onstatechange;
        }
        this.fireEvent = function (event) {
            var noteNumber = event.data[1];
            var noteValueChange = false;
            var receivedTime;
            var newState;
            if (event.data[0] === KEY_DOWN) {
                receivedTime = event.receivedTime;
                noteValueChange = true;
                newState = 0;
            }
            else if (event.data[0] === KEY_UP) {
                receivedTime = 0;
                noteValueChange = true;
                newState = event.data[2];
            }
            if (noteValueChange) {
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
    return MidiAdapter;
})();
exports.MidiAdapter = MidiAdapter;

},{"./MidiAdapterEvent":7,"./MidiState":8,"./MidiStateValue":9,"./SingletonMidiAccess":10}],7:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var MSV = require('./MidiStateValue');
var MidAd = require('./MidiAdapter');
var MidiAdapterEvent = (function () {
    function MidiAdapterEvent(note, state, adapter) {
        Object.defineProperty(this, 'note', { value: note });
        Object.defineProperty(this, 'state', { value: state });
        Object.defineProperty(this, 'adapter', { value: adapter });
    }
    return MidiAdapterEvent;
})();
exports.MidiAdapterEvent = MidiAdapterEvent;

},{"./MidiAdapter":6,"./MidiStateValue":9}],8:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var msv = require('./MidiStateValue');
var MidiStateValue = msv.MidiStateValue;
var MidiState = (function () {
    function MidiState(options) {
        var privateState = {};
        var setState = function (note, value) {
            if (!value) {
                delete privateState[note];
            }
            privateState[note] = value;
        };
        options.exposeSetter(setState);
        this.checkState = function (note) {
            if (privateState[note] === undefined) {
                privateState[note] = new MidiStateValue(0, 0);
            }
            return privateState[note];
        };
        this.getAllOn = function () {
            var values = {};
            for (var note in privateState) {
                if (privateState.hasOwnProperty(note) && privateState[note] && privateState[note].value) {
                    values[note] = privateState[note];
                }
            }
            return values;
        };
    }
    return MidiState;
})();
exports.MidiState = MidiState;

},{"./MidiStateValue":9}],9:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var MidiStateValue = (function () {
    function MidiStateValue(time, value) {
        Object.defineProperty(this, 'time', { value: time });
        Object.defineProperty(this, 'value', { value: value });
    }
    return MidiStateValue;
})();
exports.MidiStateValue = MidiStateValue;

},{}],10:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../../typings/tsd.d.ts" />
exports.midi;
exports.promise = navigator.requestMIDIAccess().then(function (access) {
    exports.midi = access;
});

},{}],11:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
function midiNumberToNote(midiNumber) {
    var octave = Math.floor(midiNumber / 12);
    return new MidiNote(midiOrder[midiNumber % 12], octave);
}
exports.midiNumberToNote = midiNumberToNote;
function noteToMidiNumber(note) {
    return reverseMidiOrder[note.note] + note.octave * 12;
}
exports.noteToMidiNumber = noteToMidiNumber;
function standardize(value) {
    if (value instanceof MidiNote) {
        return noteToMidiNumber(value);
    }
    else {
        return parseInt(value);
    }
}
exports.standardize = standardize;
function getFrequency(noteValue) {
    var midiNumber = standardize(noteValue);
    return 440 * Math.pow(2, (midiNumber - 57) / 12);
}
exports.getFrequency = getFrequency;
var MidiNote = (function () {
    function MidiNote(note, octave) {
        Object.defineProperty(this, 'note', { value: note });
        Object.defineProperty(this, 'octave', { value: octave });
        Object.defineProperty(this, 'midiNumber', { value: noteToMidiNumber(this) });
    }
    return MidiNote;
})();
exports.MidiNote = MidiNote;
var MidiNote;
(function (MidiNote) {
    function fromMidiNumber(midiNumber) {
        var root = midiOrder[midiNumber % 12];
        var octave = midiNumber / 12;
        return new MidiNote(root, octave);
    }
    MidiNote.fromMidiNumber = fromMidiNumber;
})(MidiNote = exports.MidiNote || (exports.MidiNote = {}));
(function (Root) {
    Root[Root["C"] = 0] = "C";
    Root[Root["C_SHARP"] = 1] = "C_SHARP";
    Root[Root["D_FLAT"] = 1 /* C_SHARP */] = "D_FLAT";
    Root[Root["D"] = 2] = "D";
    Root[Root["D_SHARP"] = 3] = "D_SHARP";
    Root[Root["E_FLAT"] = 3 /* D_SHARP */] = "E_FLAT";
    Root[Root["E"] = 4] = "E";
    Root[Root["E_SHARP"] = 5 /* F */] = "E_SHARP";
    Root[Root["F_FLAT"] = 4 /* E */] = "F_FLAT";
    Root[Root["F"] = 5] = "F";
    Root[Root["F_SHARP"] = 6] = "F_SHARP";
    Root[Root["G_FLAT"] = 6 /* F_SHARP */] = "G_FLAT";
    Root[Root["G"] = 7] = "G";
    Root[Root["G_SHARP"] = 8] = "G_SHARP";
    Root[Root["A_FLAT"] = 8 /* G_SHARP */] = "A_FLAT";
    Root[Root["A"] = 9] = "A";
    Root[Root["A_SHARP"] = 10] = "A_SHARP";
    Root[Root["B_FLAT"] = 10 /* A_SHARP */] = "B_FLAT";
    Root[Root["B"] = 11] = "B";
    Root[Root["B_SHARP"] = 0 /* C */] = "B_SHARP";
    Root[Root["C_FLAT"] = 11 /* B */] = "C_FLAT";
})(exports.Root || (exports.Root = {}));
var Root = exports.Root;
var midiOrder = [
    0 /* C */,
    1 /* C_SHARP */,
    2 /* D */,
    3 /* D_SHARP */,
    4 /* E */,
    5 /* F */,
    6 /* F_SHARP */,
    7 /* G */,
    8 /* G_SHARP */,
    9 /* A */,
    10 /* A_SHARP */,
    11 /* B */
];
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

},{}],12:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../typings/basic.d.ts" />
exports.filters = {
    multiply(original1, original2) {
        if (typeof original2 !== 'function') {
            var options = original2 || {};
            if (typeof options.func === "function") {
                original2 = options.func;
            }
            else {
                var value = 0.5;
                if (typeof options === 'number') {
                    value = options;
                }
                else {
                    value = options.value || 0.5;
                }
                return exports.plate(function (time, hertz) {
                    return original1(time, hertz) * value;
                });
            }
        }
        return exports.plate(function (time, hertz) {
            return original1(time, hertz) * original2(time, hertz);
        });
    },
    add(original1, original2) {
        if (typeof original2 === 'function') {
            return exports.plate(function (time, hertz) {
                return original1(time, hertz) + original2(time, hertz);
            });
        }
        else {
            return exports.plate(function (time, hertz) {
                return original1(time, hertz) + original2;
            });
        }
    },
    detune(original, options) {
        options = options || {};
        var amount = 0.5;
        if (typeof options === "number") {
            amount = options;
        }
        else {
            amount = options.amount || 0.5;
        }
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        return exports.plate(function (time, hertz) {
            var localAmount = amount;
            if (synch) {
                localAmount *= hertz;
            }
            return original(time, hertz + localAmount);
        });
    },
    phase(original, options) {
        options = options || {};
        var shift = 0.5;
        if (typeof options === "number") {
            shift = options;
        }
        else {
            shift = options.shift || 0.5;
        }
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        return exports.plate(function (time, hertz) {
            var localShift = shift;
            if (synch) {
                localShift *= 1 / hertz;
            }
            return original(time + localShift, hertz);
        });
    },
    bitcrush(original, options) {
        options = options || {};
        var bits = Math.floor(options.bits || 8);
        return exports.plate(function (time, hertz) {
            var value = original(time, hertz);
            var intValue = Math.round((value + 1) / 2 * bits);
            return (intValue / bits * 2) - 1;
        });
    },
    flatResample(original, options) {
        options = options || {};
        options.rate = Math.floor(options.rate || 4410);
        return exports.plate(function (time, hertz) {
            var intTime = Math.floor(time * options.rate);
            return original(intTime / options.rate, hertz);
        });
    },
    slopeResample(original, options) {
        options = options || {};
        options.rate = Math.floor(options.rate || 4410);
        return exports.plate(function (time, hertz) {
            var between = time * options.rate;
            var intTime = Math.floor(between);
            between = between % 1;
            var first = original(intTime / options.rate, hertz);
            var second = original((intTime + 1) / options.rate, hertz);
            return (second * between) + (first * (1 - between));
        });
    },
    crazyTown(original, options) {
        options = options || {};
        var variance = typeof options.variance === 'number' ? options.variance : 10;
        var rate = typeof options.rate === 'number' ? options.rate : 100;
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        var valueFunc = options.valueFunc || exports.oscillations.sine;
        return exports.plate(function (time, hertz) {
            var valueRate = rate;
            if (synch) {
                valueRate = rate * hertz;
            }
            var newHertz = hertz + valueFunc(time, valueRate) * variance;
            return original(time, newHertz);
        });
    },
    crossPlate(original1, original2, options) {
        options = options || {};
        var highFreq = options.highFreq || 8;
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        var highFunc = options.highFunc || exports.oscillations.triangle;
        return exports.plate(function (time, hertz) {
            var superFreq = highFreq;
            if (synch) {
                superFreq *= hertz;
            }
            var superVal = (highFunc(time, superFreq) + 1) / 2;
            var val1 = original1(time, hertz);
            var val2 = original2(time, hertz);
            return superVal * (val1 - val2) + val2;
        });
    }
};
exports.plate = function (func) {
    for (var name in exports.filters) {
        if (exports.filters.hasOwnProperty(name)) {
            (function (localName) {
                func[localName] = function () {
                    var args = [func];
                    for (var i = 0; i < arguments.length; i++) {
                        args.push(arguments[i]);
                    }
                    return exports.filters[localName].apply(window, args);
                };
            })(name);
        }
    }
    return func;
};
exports.oscillations = {
    sine: exports.plate(function (time, hertz) {
        return Math.sin(time * hertz * 2 * Math.PI);
    }),
    square: exports.plate(function (time, hertz) {
        return (time * hertz) % 1 < 0.5 ? 1 : -1;
    }),
    triangle: exports.plate(function (time, hertz) {
        var slope = (time * hertz) % 1;
        return slope < 0.5 ? slope * 4 - 1 : slope * -4 + 3;
    }),
    roughMath: exports.plate(function (time, hertz) {
        return Math.pow((exports.oscillations.sine(time - (0.25 / hertz), hertz) + 1) / 2, 1 / 2) * 2 - 1;
    }),
    roughMath2: exports.plate(function (time, hertz) {
        hertz = hertz / 2;
        return (exports.oscillations.sine(time, hertz) + exports.oscillations.sawtooth(time, hertz)) * exports.oscillations.triangle(time + (0.25 / hertz), hertz) * 3 - 0.5;
    }),
    roughMath3: exports.plate(function (time, hertz) {
        var slope = (time * hertz) % 1;
        return Math.sinh((slope * 2 - 1) * 5) * 0.0138;
    }),
    roughMath4: exports.plate(function (time, hertz) {
        time = time * 2;
        var slope = (time * hertz);
        var val = Math.sinh(((slope % 1) * 2 - 1) * 5) * 0.0138;
        return slope % 2 < 1 ? val : -val;
    }),
    sawtooth: exports.plate(function (time, hertz) {
        return ((time * hertz) % 1) * 2 - 1;
    }),
    fromValue: function (value) {
        return exports.plate(function (time, hertz) {
            return value;
        });
    },
    noise: exports.plate(function (time, hertz) {
        return Math.random() * 2 - 1;
    })
};

},{}],13:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
 * Created by Kevin on 4/14/2015.
 */
var Src = require('./Source');
var SampleSource = (function (_super) {
    __extends(SampleSource, _super);
    function SampleSource(options) {
        var sample = options.sample;
        var repeat = options.repeat;
        var requestData;
        if (repeat) {
            requestData = function (startPoint, length) {
                var subSample = [];
                for (var i = 0; i < length; i++) {
                    subSample.push(sample[(i + startPoint) % sample.length]);
                }
                return subSample;
            };
        }
        else {
            requestData = function (startPoint, length) {
                var subSample = [];
                for (var i = 0; i < length; i++) {
                    subSample.push(sample[i + startPoint] || 0);
                }
                return subSample;
            };
        }
        _super.call(this, { requestData: requestData });
    }
    return SampleSource;
})(Src.Source);
exports.SampleSource = SampleSource;

},{"./Source":14}],14:[function(require,module,exports){
/**
 * Created by Kevin on 4/14/2015.
 */
var Source = (function () {
    function Source(options) {
        this.requestData = options.requestData;
    }
    return Source;
})();
exports.Source = Source;

},{}],15:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/**
 * Created by Kevin on 4/14/2015.
 */
var Src = require('./Source');
var VariableSource = (function (_super) {
    __extends(VariableSource, _super);
    function VariableSource(options) {
        var self = this;
        var expectedData = options.expectedData || [];
        var variableRequestData = options.requestData;
        this.data = options.data || {};
        Object.defineProperty(this, 'expectedData', { value: expectedData });
        _super.call(this, {
            requestData: function (startPoint, length, sampleRate, tmpData) {
                return variableRequestData(startPoint, length, sampleRate, tmpData || self.data);
            }
        });
        _super.call(this, options);
    }
    return VariableSource;
})(Src.Source);
exports.VariableSource = VariableSource;

},{"./Source":14}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImM6XFxEZXZcXHNvdW5kd29ya3NcXG5vZGVfbW9kdWxlc1xcZ3VscC1icm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsImM6L0Rldi9zb3VuZHdvcmtzL3RtcC9qcy9CdWZmZXJlZFNvdW5kLmpzIiwiYzovRGV2L3NvdW5kd29ya3MvdG1wL2pzL09zY2lsbGF0b3IuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvU2luZ2xldG9uQXVkaW9Db250ZXh0LmpzIiwiYzovRGV2L3NvdW5kd29ya3MvdG1wL2pzL1NvdXJjZVNvdW5kLmpzIiwiYzovRGV2L3NvdW5kd29ya3MvdG1wL2pzL2Zha2VfNDljYjhkYjYuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvbWlkaS9NaWRpQWRhcHRlci5qcyIsImM6L0Rldi9zb3VuZHdvcmtzL3RtcC9qcy9taWRpL01pZGlBZGFwdGVyRXZlbnQuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvbWlkaS9NaWRpU3RhdGUuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvbWlkaS9NaWRpU3RhdGVWYWx1ZS5qcyIsImM6L0Rldi9zb3VuZHdvcmtzL3RtcC9qcy9taWRpL1NpbmdsZXRvbk1pZGlBY2Nlc3MuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvbWlkaS9taWRpSGVscGVycy5qcyIsImM6L0Rldi9zb3VuZHdvcmtzL3RtcC9qcy9vc2NpbGxhdGlvbnMuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvc291cmNlcy9TYW1wbGVTb3VyY2UuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvc291cmNlcy9Tb3VyY2UuanMiLCJjOi9EZXYvc291bmR3b3Jrcy90bXAvanMvc291cmNlcy9WYXJpYWJsZVNvdXJjZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IEtldmluIG9uIDQvMTQvMjAxNS5cbiAqL1xudmFyIHNhYyA9IHJlcXVpcmUoJy4vU2luZ2xldG9uQXVkaW9Db250ZXh0Jyk7XG52YXIgY29udGV4dCA9IHNhYy5jb250ZXh0O1xudmFyIEJ1ZmZlcmVkU291bmQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEJ1ZmZlcmVkU291bmQob3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb3B0aW9ucy5kdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgMTtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDEsIE1hdGguZmxvb3Iob3B0aW9ucy5kdXJhdGlvbiAqIDQ0MTAwKSwgNDQxMDApO1xuICAgICAgICB2YXIgZ2Fpbk5vZGUgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgdmFyIHNvdXJjZTtcbiAgICAgICAgdGhpcy5kdXJhdGlvbiA9IGJ1ZmZlci5kdXJhdGlvbjtcbiAgICAgICAgdGhpcy5sZW5ndGggPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICB0aGlzLnNhbXBsZVJhdGUgPSBidWZmZXIuc2FtcGxlUmF0ZTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2b2x1bWUnLCB7IGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdhaW5Ob2RlLmdhaW4udmFsdWU7XG4gICAgICAgIH0sIHNldDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGdhaW5Ob2RlLmdhaW4udmFsdWUgPSB2YWw7XG4gICAgICAgIH0gfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaXNQbGF5aW5nJywgeyBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2UgIT09IHVuZGVmaW5lZDtcbiAgICAgICAgfSB9KTtcbiAgICAgICAgZnVuY3Rpb24gY3JlYXRlU291cmNlKCkge1xuICAgICAgICAgICAgc291cmNlID0gY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIHNvdXJjZS5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9vcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdmFyIG15U291cmNlID0gY3JlYXRlU291cmNlKCk7XG4gICAgICAgICAgICBteVNvdXJjZS5sb29wID0gdHJ1ZTtcbiAgICAgICAgICAgIG15U291cmNlLnN0YXJ0KCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHNvdXJjZS5zdG9wKCk7XG4gICAgICAgICAgICAgICAgc291cmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmxvb3BFbnF1ZXVlID0gZnVuY3Rpb24gKGRhdGEsIHN0YXJ0SW5kZXgsIGJ1ZmZlclN0YXJ0SW5kZXgsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHN0YXJ0SW5kZXggPT09IHZvaWQgMCkgeyBzdGFydEluZGV4ID0gMDsgfVxuICAgICAgICAgICAgaWYgKGJ1ZmZlclN0YXJ0SW5kZXggPT09IHZvaWQgMCkgeyBidWZmZXJTdGFydEluZGV4ID0gMDsgfVxuICAgICAgICAgICAgaWYgKGxlbmd0aCA9PT0gdm9pZCAwKSB7IGxlbmd0aCA9IDA7IH1cbiAgICAgICAgICAgIHZhciBjaGFubmVsRGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgIGxlbmd0aCA9IGxlbmd0aCB8fCBkYXRhLmxlbmd0aCAtIHN0YXJ0SW5kZXg7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGFJbmRleCA9IChpICsgc3RhcnRJbmRleCkgJSBkYXRhLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB2YXIgYnVmZmVySW5kZXggPSAoaSArIGJ1ZmZlclN0YXJ0SW5kZXgpICUgYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjaGFubmVsRGF0YVtidWZmZXJJbmRleF0gPSBkYXRhW2RhdGFJbmRleF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZW5xdWV1ZSA9IGZ1bmN0aW9uIChkYXRhLCBzdGFydEluZGV4LCBidWZmZXJTdGFydEluZGV4LCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzdGFydEluZGV4ID09PSB2b2lkIDApIHsgc3RhcnRJbmRleCA9IDA7IH1cbiAgICAgICAgICAgIGlmIChidWZmZXJTdGFydEluZGV4ID09PSB2b2lkIDApIHsgYnVmZmVyU3RhcnRJbmRleCA9IDA7IH1cbiAgICAgICAgICAgIGlmIChsZW5ndGggPT09IHZvaWQgMCkgeyBsZW5ndGggPSAwOyB9XG4gICAgICAgICAgICB2YXIgY2hhbm5lbERhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICBsZW5ndGggPSBsZW5ndGggfHwgZGF0YS5sZW5ndGggLSBzdGFydEluZGV4O1xuICAgICAgICAgICAgaWYgKHN0YXJ0SW5kZXggKyBsZW5ndGggPiBkYXRhLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0luZGV4ICcgKyAoc3RhcnRJbmRleCArIGxlbmd0aCkgKyAnIGZhbGxzIG91dHNpZGUgb2YgdGhlIGJvdW5kcyBvZiB0aGUgaW5wdXQgZGF0YS4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWZmZXJTdGFydEluZGV4ICsgbGVuZ3RoID4gYnVmZmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0luZGV4ICcgKyAoYnVmZmVyU3RhcnRJbmRleCArIGxlbmd0aCkgKyAnIGZhbGxzIG91dHNpZGUgb2YgdGhlIGJvdW5kcyBvZiB0aGUgYnVmZmVyIGRhdGEuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RhcnRJbmRleCArIGxlbmd0aCA+IGRhdGEubGVuZ3RoIHx8IGJ1ZmZlclN0YXJ0SW5kZXggKyBsZW5ndGggPiBjaGFubmVsRGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGFJbmRleCA9IGkgKyBzdGFydEluZGV4O1xuICAgICAgICAgICAgICAgIHZhciBidWZmZXJJbmRleCA9IGkgKyBidWZmZXJTdGFydEluZGV4O1xuICAgICAgICAgICAgICAgIGNoYW5uZWxEYXRhW2J1ZmZlckluZGV4XSA9IGRhdGFbZGF0YUluZGV4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIEJ1ZmZlcmVkU291bmQ7XG59KSgpO1xuZXhwb3J0cy5CdWZmZXJlZFNvdW5kID0gQnVmZmVyZWRTb3VuZDtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBLZXZpbiBvbiA0LzE0LzIwMTUuXG4gKi9cbnZhciBWYXJpYWJsZVNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlcy9WYXJpYWJsZVNvdXJjZScpO1xudmFyIG9zYyA9IHJlcXVpcmUoJy4vb3NjaWxsYXRpb25zJyk7XG52YXIgT3NjaWxsYXRvciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gT3NjaWxsYXRvcihvcHRpb25zKSB7XG4gICAgICAgIHZhciBvc2NpbGxhdGlvbiA9IG9wdGlvbnMub3NjaWxsYXRpb24gfHwgb3NjLm9zY2lsbGF0aW9ucy5zaW5lO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ29zY2lsbGF0aW9uJywgeyB2YWx1ZTogb3NjaWxsYXRpb24gfSk7XG4gICAgICAgIHRoaXMuZ2V0U3RyZWFtU291cmNlID0gZnVuY3Rpb24gKGhlcnR6KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZhcmlhYmxlU291cmNlLlZhcmlhYmxlU291cmNlKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGZyZXF1ZW5jeTogaGVydHogfSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZERhdGE6IFsnZnJlcXVlbmN5J10sXG4gICAgICAgICAgICAgICAgcmVxdWVzdERhdGE6IGZ1bmN0aW9uIChzdGFydFBvaW50LCBsZW5ndGgsIHNhbXBsZVJhdGUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlUmF0ZSA9IHNhbXBsZVJhdGUgfHwgNDQxMDA7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdGFydFRpbWUgPSBzdGFydFBvaW50IC8gc2FtcGxlUmF0ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoKG9zY2lsbGF0aW9uKHN0YXJ0VGltZSArIChpIC8gc2FtcGxlUmF0ZSksIG9wdGlvbnMuZnJlcXVlbmN5KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBPc2NpbGxhdG9yO1xufSkoKTtcbmV4cG9ydHMuT3NjaWxsYXRvciA9IE9zY2lsbGF0b3I7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgS2V2aW4gb24gNC8xNC8yMDE1LlxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XG5BdWRpb0NvbnRleHQgPSBBdWRpb0NvbnRleHQgfHwgd2Via2l0QXVkaW9Db250ZXh0O1xuZXhwb3J0cy5jb250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuIiwidmFyIHNhYyA9IHJlcXVpcmUoJy4vU2luZ2xldG9uQXVkaW9Db250ZXh0Jyk7XG5jb25zdCBjb250ZXh0ID0gc2FjLmNvbnRleHQ7XG5jb25zdCBvbmVTZWNJbk1zID0gMTAwMDtcbmNvbnN0IGRlZmF1bHREZWxheSA9IDAuMTtcbmNvbnN0IGRlZmF1bHRCdWZmZXJDb3VudCA9IDM7XG5jb25zdCBkZWZhdWx0U2FtcGxlUmF0ZSA9IDQ0MTAwO1xuLy9UT0RPOiBtYWtlIGRlZmF1bHQgY2hhbm5lbCBjb3VudCAyXG5jb25zdCBkZWZhdWx0Q2hhbm5lbENvdW50ID0gMTtcbnZhciBTb3VyY2VTb3VuZCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU291cmNlU291bmQob3B0aW9ucykge1xuICAgICAgICBpZiAoKHR5cGVvZiBvcHRpb25zLmRlbGF5ICE9PSBcIm51bWJlclwiICYmIHR5cGVvZiBvcHRpb25zLmRlbGF5ICE9PSBcInVuZGVmaW5lZFwiKSB8fCAodHlwZW9mIG9wdGlvbnMuZGVsYXkgPT09IFwibnVtYmVyXCIgJiYgb3B0aW9ucy5kZWxheSA8PSAwKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSWYgYSBkZWxheSBpcyBzdXBwbGllZCwgaXQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlclwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc291cmNlID0gb3B0aW9ucy5zb3VyY2U7XG4gICAgICAgIHZhciBkZWxheSA9IG9wdGlvbnMuZGVsYXkgfHwgZGVmYXVsdERlbGF5O1xuICAgICAgICB2YXIgYnVmZmVyQ291bnQgPSBvcHRpb25zLmJ1ZmZlckNvdW50IHx8IGRlZmF1bHRCdWZmZXJDb3VudDtcbiAgICAgICAgdmFyIHNhbXBsZVJhdGUgPSBvcHRpb25zLnNhbXBsZVJhdGUgfHwgZGVmYXVsdFNhbXBsZVJhdGU7XG4gICAgICAgIC8vVE9ETzogbWFrZSBjaGFubmVsQ291bnQgdmFyaWFibGUgYmFzZWQgb24gY29uc3RydWN0b3IgaW5wdXRcbiAgICAgICAgdmFyIGNoYW5uZWxDb3VudCA9IGRlZmF1bHRDaGFubmVsQ291bnQ7XG4gICAgICAgIHZhciBidWZmZXJTaXplID0gTWF0aC5mbG9vcihkZWxheSAqIHNhbXBsZVJhdGUpO1xuICAgICAgICB2YXIgZnVsbEJ1ZmZlclNpemUgPSBidWZmZXJTaXplICogYnVmZmVyQ291bnQ7XG4gICAgICAgIHZhciBidWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcihjaGFubmVsQ291bnQsIGZ1bGxCdWZmZXJTaXplLCBzYW1wbGVSYXRlKTtcbiAgICAgICAgdmFyIGdhaW5Ob2RlID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgIHZhciBjdXJyZW50RnJhbWUgPSAwO1xuICAgICAgICB2YXIgYnVmZmVyU291cmNlO1xuICAgICAgICB2YXIgdGltZW91dElkID0gMDtcbiAgICAgICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICAgICAgdmFyIHN0YXJ0VGltZSA9IDA7XG4gICAgICAgIHZhciBpc1BsYXlpbmcgPSBmYWxzZTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpc1BsYXlpbmcnLCB7IGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGlzUGxheWluZztcbiAgICAgICAgfSB9KTtcbiAgICAgICAgdmFyIGZpbGxCdWZmZXIgPSBmdW5jdGlvbiAoc3RhcnRpbmdGcmFtZSwgbGVuZ3RoLCBvcHRpb25zLCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoY2hhbm5lbCA9PT0gdm9pZCAwKSB7IGNoYW5uZWwgPSAwOyB9XG4gICAgICAgICAgICB2YXIgY2hhbm5lbERhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoY2hhbm5lbCk7XG4gICAgICAgICAgICB2YXIgbmV3RGF0YSA9IHNvdXJjZS5yZXF1ZXN0RGF0YShzdGFydGluZ0ZyYW1lLCBsZW5ndGgsIHNhbXBsZVJhdGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuZXdEYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbERhdGFbKGkgKyBzdGFydGluZ0ZyYW1lKSAlIGNoYW5uZWxEYXRhLmxlbmd0aF0gPSBuZXdEYXRhW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgY3JlYXRlQnVmZmVyU291cmNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICBvdXRwdXQuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICAgICAgb3V0cHV0Lmxvb3AgPSB0cnVlO1xuICAgICAgICAgICAgb3V0cHV0LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGZyYW1lc0VsYXBzZWQgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgICAgICAgICAgdmFyIHN0YXJ0RnJhbWUgPSBNYXRoLnJvdW5kKHN0YXJ0ICogc2FtcGxlUmF0ZSk7XG4gICAgICAgICAgICB2YXIgZW5kRnJhbWUgPSBNYXRoLnJvdW5kKGVuZCAqIHNhbXBsZVJhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIGVuZEZyYW1lIC0gc3RhcnRGcmFtZTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5wbGF5ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGN1cnJlbnRGcmFtZSA9IGZ1bGxCdWZmZXJTaXplIC0gKGJ1ZmZlclNpemUgLyAyKTtcbiAgICAgICAgICAgIGZpbGxCdWZmZXIoMCwgZnVsbEJ1ZmZlclNpemUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFyIGV4cGVjdGVkTXMgPSBkZWxheSAqIG9uZVNlY0luTXM7XG4gICAgICAgICAgICB2YXIgbWF4RXJyID0gZXhwZWN0ZWRNcyAqIDAuMjtcbiAgICAgICAgICAgIHZhciBtaW5FcnIgPSBleHBlY3RlZE1zICogLTAuMjtcbiAgICAgICAgICAgIHZhciB0aW1lb3V0RnVuYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudFRpbWUgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICAgICAgICAgIHZhciBkaWZmRnJhbWVzID0gZnJhbWVzRWxhcHNlZChsYXN0VGltZSwgY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgICAgIHZhciBkaWZmVGltZSA9IGN1cnJlbnRUaW1lIC0gbGFzdFRpbWU7XG4gICAgICAgICAgICAgICAgbGFzdFRpbWUgPSBjdXJyZW50VGltZTtcbiAgICAgICAgICAgICAgICBpZiAoZGlmZkZyYW1lcyA8IGZ1bGxCdWZmZXJTaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGxCdWZmZXIoY3VycmVudEZyYW1lLCBkaWZmRnJhbWVzLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRGcmFtZSArPSBkaWZmRnJhbWVzIC0gZnVsbEJ1ZmZlclNpemU7XG4gICAgICAgICAgICAgICAgICAgIGZpbGxCdWZmZXIoY3VycmVudEZyYW1lLCBmdWxsQnVmZmVyU2l6ZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnJlbnRGcmFtZSArPSBkaWZmRnJhbWVzO1xuICAgICAgICAgICAgICAgIHZhciBhY3R1YWxNcyA9IGRpZmZUaW1lICogb25lU2VjSW5NcztcbiAgICAgICAgICAgICAgICB2YXIgZXJyTXMgPSBNYXRoLm1heChtaW5FcnIsIE1hdGgubWluKGFjdHVhbE1zIC0gZXhwZWN0ZWRNcywgbWF4RXJyKSk7XG4gICAgICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCh0aW1lb3V0RnVuYywgZXhwZWN0ZWRNcyAtIGVyck1zICogMC45KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aW1lb3V0SWQgPSB3aW5kb3cuc2V0VGltZW91dCh0aW1lb3V0RnVuYywgZGVsYXkgKiBvbmVTZWNJbk1zIC0gMTApO1xuICAgICAgICAgICAgYnVmZmVyU291cmNlID0gY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICBpc1BsYXlpbmcgPSB0cnVlO1xuICAgICAgICAgICAgbGFzdFRpbWUgPSBzdGFydFRpbWUgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICAgICAgYnVmZmVyU291cmNlLnN0YXJ0KCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlzUGxheWluZyA9IGZhbHNlO1xuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgdGltZW91dElkID0gMDtcbiAgICAgICAgICAgIGJ1ZmZlclNvdXJjZS5zdG9wKCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBTb3VyY2VTb3VuZDtcbn0pKCk7XG5leHBvcnRzLlNvdXJjZVNvdW5kID0gU291cmNlU291bmQ7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgS2V2aW4gb24gNC8xNC8yMDE1LlxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vdHlwaW5ncy9iYXNpYy5kLnRzXCIgLz5cbnZhciBTcmNTbmQgPSByZXF1aXJlKCcuL1NvdXJjZVNvdW5kJyk7XG52YXIgQnVmZlNuZCA9IHJlcXVpcmUoJy4vQnVmZmVyZWRTb3VuZCcpO1xudmFyIG9zYyA9IHJlcXVpcmUoJy4vb3NjaWxsYXRpb25zJyk7XG52YXIgT3NjID0gcmVxdWlyZSgnLi9Pc2NpbGxhdG9yJyk7XG52YXIgU3JjID0gcmVxdWlyZSgnLi9zb3VyY2VzL1NvdXJjZScpO1xudmFyIFZhclNyYyA9IHJlcXVpcmUoJy4vc291cmNlcy9WYXJpYWJsZVNvdXJjZScpO1xudmFyIFNwbFNyYyA9IHJlcXVpcmUoJy4vc291cmNlcy9TYW1wbGVTb3VyY2UnKTtcbnZhciBNaWRTdCA9IHJlcXVpcmUoJy4vbWlkaS9NaWRpU3RhdGUnKTtcbnZhciBNaWRBZCA9IHJlcXVpcmUoJy4vbWlkaS9NaWRpQWRhcHRlcicpO1xudmFyIG1pZGlIZWxwZXJzID0gcmVxdWlyZSgnLi9taWRpL21pZGlIZWxwZXJzJyk7XG52YXIgU291bmRXb3JrcztcbihmdW5jdGlvbiAoU291bmRXb3Jrcykge1xuICAgIFNvdW5kV29ya3MuU291cmNlU291bmQgPSBTcmNTbmQuU291cmNlU291bmQ7XG4gICAgU291bmRXb3Jrcy5CdWZmZXJlZFNvdW5kID0gQnVmZlNuZC5CdWZmZXJlZFNvdW5kO1xuICAgIFNvdW5kV29ya3MuT3NjaWxsYXRvciA9IE9zYy5Pc2NpbGxhdG9yO1xuICAgIHZhciBNaWRpO1xuICAgIChmdW5jdGlvbiAoTWlkaSkge1xuICAgICAgICBNaWRpLk1pZGlTdGF0ZSA9IE1pZFN0Lk1pZGlTdGF0ZTtcbiAgICAgICAgTWlkaS5NaWRpQWRhcHRlciA9IE1pZEFkLk1pZGlBZGFwdGVyO1xuICAgICAgICBNaWRpLmhlbHBlcnMgPSBtaWRpSGVscGVycztcbiAgICB9KShNaWRpID0gU291bmRXb3Jrcy5NaWRpIHx8IChTb3VuZFdvcmtzLk1pZGkgPSB7fSkpO1xuICAgIHZhciBTb3VyY2U7XG4gICAgKGZ1bmN0aW9uIChTb3VyY2UpIHtcbiAgICAgICAgU291cmNlLkJhc2UgPSBTcmMuU291cmNlO1xuICAgICAgICBTb3VyY2UuVmFyaWFibGUgPSBWYXJTcmMuVmFyaWFibGVTb3VyY2U7XG4gICAgICAgIFNvdXJjZS5TYW1wbGUgPSBTcGxTcmMuU2FtcGxlU291cmNlO1xuICAgIH0pKFNvdXJjZSA9IFNvdW5kV29ya3MuU291cmNlIHx8IChTb3VuZFdvcmtzLlNvdXJjZSA9IHt9KSk7XG4gICAgdmFyIE9zY2lsbGF0b3JIZWxwZXJzO1xuICAgIChmdW5jdGlvbiAoT3NjaWxsYXRvckhlbHBlcnMpIHtcbiAgICAgICAgT3NjaWxsYXRvckhlbHBlcnMub3NjaWxsYXRpb25zID0gb3NjLm9zY2lsbGF0aW9ucztcbiAgICAgICAgT3NjaWxsYXRvckhlbHBlcnMuZmlsdGVycyA9IG9zYy5maWx0ZXJzO1xuICAgICAgICBPc2NpbGxhdG9ySGVscGVycy5wbGF0ZSA9IG9zYy5wbGF0ZTtcbiAgICB9KShPc2NpbGxhdG9ySGVscGVycyA9IFNvdW5kV29ya3MuT3NjaWxsYXRvckhlbHBlcnMgfHwgKFNvdW5kV29ya3MuT3NjaWxsYXRvckhlbHBlcnMgPSB7fSkpO1xufSkoU291bmRXb3JrcyA9IGV4cG9ydHMuU291bmRXb3JrcyB8fCAoZXhwb3J0cy5Tb3VuZFdvcmtzID0ge30pKTtcbndpbmRvdy5zb3VuZFdvcmtzID0gU291bmRXb3JrcztcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBLZXZpbiBvbiA0LzE0LzIwMTUuXG4gKi9cbnZhciBNaWRTdCA9IHJlcXVpcmUoJy4vTWlkaVN0YXRlJyk7XG52YXIgTVNWID0gcmVxdWlyZSgnLi9NaWRpU3RhdGVWYWx1ZScpO1xudmFyIE1BRSA9IHJlcXVpcmUoJy4vTWlkaUFkYXB0ZXJFdmVudCcpO1xudmFyIHNtYSA9IHJlcXVpcmUoJy4vU2luZ2xldG9uTWlkaUFjY2VzcycpO1xudmFyIE1pZGlTdGF0ZSA9IE1pZFN0Lk1pZGlTdGF0ZTtcbnZhciBNaWRpU3RhdGVWYWx1ZSA9IE1TVi5NaWRpU3RhdGVWYWx1ZTtcbnZhciBNaWRpQWRhcHRlckV2ZW50ID0gTUFFLk1pZGlBZGFwdGVyRXZlbnQ7XG52YXIgYWRhcHRlckxpc3QgPSBbXTtcbnZhciBtaWRpO1xudmFyIGlucHV0cztcbnZhciBLRVlfRE9XTiA9IDE1NjtcbnZhciBLRVlfVVAgPSAxNDA7XG5zbWEucHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICBtaWRpID0gc21hLm1pZGk7XG4gICAgaW5wdXRzID0gbWlkaS5pbnB1dHM7XG4gICAgaW5wdXRzLmdldCgwKS5vbm1pZGltZXNzYWdlID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gYWRhcHRlckxpc3QpIHtcbiAgICAgICAgICAgIGFkYXB0ZXJMaXN0W2ldLmZpcmVFdmVudChldik7XG4gICAgICAgIH1cbiAgICB9O1xufSk7XG52YXIgTWlkaUFkYXB0ZXIgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1pZGlBZGFwdGVyKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNldFN0YXRlO1xuICAgICAgICB2YXIgbWlkaVN0YXRlID0gbmV3IE1pZGlTdGF0ZSh7XG4gICAgICAgICAgICBleHBvc2VTZXR0ZXI6IGZ1bmN0aW9uIChzZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICBzZXRTdGF0ZSA9IHNldHRlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbnN0YXRlY2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLm9uc3RhdGVjaGFuZ2UgPSBvcHRpb25zLm9uc3RhdGVjaGFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maXJlRXZlbnQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBub3RlTnVtYmVyID0gZXZlbnQuZGF0YVsxXTtcbiAgICAgICAgICAgIHZhciBub3RlVmFsdWVDaGFuZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgIHZhciByZWNlaXZlZFRpbWU7XG4gICAgICAgICAgICB2YXIgbmV3U3RhdGU7XG4gICAgICAgICAgICBpZiAoZXZlbnQuZGF0YVswXSA9PT0gS0VZX0RPV04pIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlZFRpbWUgPSBldmVudC5yZWNlaXZlZFRpbWU7XG4gICAgICAgICAgICAgICAgbm90ZVZhbHVlQ2hhbmdlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBuZXdTdGF0ZSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChldmVudC5kYXRhWzBdID09PSBLRVlfVVApIHtcbiAgICAgICAgICAgICAgICByZWNlaXZlZFRpbWUgPSAwO1xuICAgICAgICAgICAgICAgIG5vdGVWYWx1ZUNoYW5nZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgbmV3U3RhdGUgPSBldmVudC5kYXRhWzJdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vdGVWYWx1ZUNoYW5nZSkge1xuICAgICAgICAgICAgICAgIHZhciBzdGF0ZSA9IG5ldyBNaWRpU3RhdGVWYWx1ZShyZWNlaXZlZFRpbWUsIG5ld1N0YXRlKTtcbiAgICAgICAgICAgICAgICBzZXRTdGF0ZShub3RlTnVtYmVyLCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm9uc3RhdGVjaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbnN0YXRlY2hhbmdlKG5ldyBNaWRpQWRhcHRlckV2ZW50KG5vdGVOdW1iZXIsIHN0YXRlLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N0YXRlJywgeyB2YWx1ZTogbWlkaVN0YXRlIH0pO1xuICAgICAgICBhZGFwdGVyTGlzdC5wdXNoKHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gTWlkaUFkYXB0ZXI7XG59KSgpO1xuZXhwb3J0cy5NaWRpQWRhcHRlciA9IE1pZGlBZGFwdGVyO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IEtldmluIG9uIDQvMTQvMjAxNS5cbiAqL1xudmFyIE1TViA9IHJlcXVpcmUoJy4vTWlkaVN0YXRlVmFsdWUnKTtcbnZhciBNaWRBZCA9IHJlcXVpcmUoJy4vTWlkaUFkYXB0ZXInKTtcbnZhciBNaWRpQWRhcHRlckV2ZW50ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNaWRpQWRhcHRlckV2ZW50KG5vdGUsIHN0YXRlLCBhZGFwdGVyKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm90ZScsIHsgdmFsdWU6IG5vdGUgfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3RhdGUnLCB7IHZhbHVlOiBzdGF0ZSB9KTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGFwdGVyJywgeyB2YWx1ZTogYWRhcHRlciB9KTtcbiAgICB9XG4gICAgcmV0dXJuIE1pZGlBZGFwdGVyRXZlbnQ7XG59KSgpO1xuZXhwb3J0cy5NaWRpQWRhcHRlckV2ZW50ID0gTWlkaUFkYXB0ZXJFdmVudDtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBLZXZpbiBvbiA0LzE0LzIwMTUuXG4gKi9cbnZhciBtc3YgPSByZXF1aXJlKCcuL01pZGlTdGF0ZVZhbHVlJyk7XG52YXIgTWlkaVN0YXRlVmFsdWUgPSBtc3YuTWlkaVN0YXRlVmFsdWU7XG52YXIgTWlkaVN0YXRlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNaWRpU3RhdGUob3B0aW9ucykge1xuICAgICAgICB2YXIgcHJpdmF0ZVN0YXRlID0ge307XG4gICAgICAgIHZhciBzZXRTdGF0ZSA9IGZ1bmN0aW9uIChub3RlLCB2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBwcml2YXRlU3RhdGVbbm90ZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcml2YXRlU3RhdGVbbm90ZV0gPSB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgb3B0aW9ucy5leHBvc2VTZXR0ZXIoc2V0U3RhdGUpO1xuICAgICAgICB0aGlzLmNoZWNrU3RhdGUgPSBmdW5jdGlvbiAobm90ZSkge1xuICAgICAgICAgICAgaWYgKHByaXZhdGVTdGF0ZVtub3RlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcHJpdmF0ZVN0YXRlW25vdGVdID0gbmV3IE1pZGlTdGF0ZVZhbHVlKDAsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByaXZhdGVTdGF0ZVtub3RlXTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5nZXRBbGxPbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZXMgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIG5vdGUgaW4gcHJpdmF0ZVN0YXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHByaXZhdGVTdGF0ZS5oYXNPd25Qcm9wZXJ0eShub3RlKSAmJiBwcml2YXRlU3RhdGVbbm90ZV0gJiYgcHJpdmF0ZVN0YXRlW25vdGVdLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlc1tub3RlXSA9IHByaXZhdGVTdGF0ZVtub3RlXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gTWlkaVN0YXRlO1xufSkoKTtcbmV4cG9ydHMuTWlkaVN0YXRlID0gTWlkaVN0YXRlO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IEtldmluIG9uIDQvMTQvMjAxNS5cbiAqL1xudmFyIE1pZGlTdGF0ZVZhbHVlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBNaWRpU3RhdGVWYWx1ZSh0aW1lLCB2YWx1ZSkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3RpbWUnLCB7IHZhbHVlOiB0aW1lIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3ZhbHVlJywgeyB2YWx1ZTogdmFsdWUgfSk7XG4gICAgfVxuICAgIHJldHVybiBNaWRpU3RhdGVWYWx1ZTtcbn0pKCk7XG5leHBvcnRzLk1pZGlTdGF0ZVZhbHVlID0gTWlkaVN0YXRlVmFsdWU7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgS2V2aW4gb24gNC8xNC8yMDE1LlxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XG5leHBvcnRzLm1pZGk7XG5leHBvcnRzLnByb21pc2UgPSBuYXZpZ2F0b3IucmVxdWVzdE1JRElBY2Nlc3MoKS50aGVuKGZ1bmN0aW9uIChhY2Nlc3MpIHtcbiAgICBleHBvcnRzLm1pZGkgPSBhY2Nlc3M7XG59KTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBLZXZpbiBvbiA0LzE0LzIwMTUuXG4gKi9cbmZ1bmN0aW9uIG1pZGlOdW1iZXJUb05vdGUobWlkaU51bWJlcikge1xuICAgIHZhciBvY3RhdmUgPSBNYXRoLmZsb29yKG1pZGlOdW1iZXIgLyAxMik7XG4gICAgcmV0dXJuIG5ldyBNaWRpTm90ZShtaWRpT3JkZXJbbWlkaU51bWJlciAlIDEyXSwgb2N0YXZlKTtcbn1cbmV4cG9ydHMubWlkaU51bWJlclRvTm90ZSA9IG1pZGlOdW1iZXJUb05vdGU7XG5mdW5jdGlvbiBub3RlVG9NaWRpTnVtYmVyKG5vdGUpIHtcbiAgICByZXR1cm4gcmV2ZXJzZU1pZGlPcmRlcltub3RlLm5vdGVdICsgbm90ZS5vY3RhdmUgKiAxMjtcbn1cbmV4cG9ydHMubm90ZVRvTWlkaU51bWJlciA9IG5vdGVUb01pZGlOdW1iZXI7XG5mdW5jdGlvbiBzdGFuZGFyZGl6ZSh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIE1pZGlOb3RlKSB7XG4gICAgICAgIHJldHVybiBub3RlVG9NaWRpTnVtYmVyKHZhbHVlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludCh2YWx1ZSk7XG4gICAgfVxufVxuZXhwb3J0cy5zdGFuZGFyZGl6ZSA9IHN0YW5kYXJkaXplO1xuZnVuY3Rpb24gZ2V0RnJlcXVlbmN5KG5vdGVWYWx1ZSkge1xuICAgIHZhciBtaWRpTnVtYmVyID0gc3RhbmRhcmRpemUobm90ZVZhbHVlKTtcbiAgICByZXR1cm4gNDQwICogTWF0aC5wb3coMiwgKG1pZGlOdW1iZXIgLSA1NykgLyAxMik7XG59XG5leHBvcnRzLmdldEZyZXF1ZW5jeSA9IGdldEZyZXF1ZW5jeTtcbnZhciBNaWRpTm90ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTWlkaU5vdGUobm90ZSwgb2N0YXZlKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnbm90ZScsIHsgdmFsdWU6IG5vdGUgfSk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnb2N0YXZlJywgeyB2YWx1ZTogb2N0YXZlIH0pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ21pZGlOdW1iZXInLCB7IHZhbHVlOiBub3RlVG9NaWRpTnVtYmVyKHRoaXMpIH0pO1xuICAgIH1cbiAgICByZXR1cm4gTWlkaU5vdGU7XG59KSgpO1xuZXhwb3J0cy5NaWRpTm90ZSA9IE1pZGlOb3RlO1xudmFyIE1pZGlOb3RlO1xuKGZ1bmN0aW9uIChNaWRpTm90ZSkge1xuICAgIGZ1bmN0aW9uIGZyb21NaWRpTnVtYmVyKG1pZGlOdW1iZXIpIHtcbiAgICAgICAgdmFyIHJvb3QgPSBtaWRpT3JkZXJbbWlkaU51bWJlciAlIDEyXTtcbiAgICAgICAgdmFyIG9jdGF2ZSA9IG1pZGlOdW1iZXIgLyAxMjtcbiAgICAgICAgcmV0dXJuIG5ldyBNaWRpTm90ZShyb290LCBvY3RhdmUpO1xuICAgIH1cbiAgICBNaWRpTm90ZS5mcm9tTWlkaU51bWJlciA9IGZyb21NaWRpTnVtYmVyO1xufSkoTWlkaU5vdGUgPSBleHBvcnRzLk1pZGlOb3RlIHx8IChleHBvcnRzLk1pZGlOb3RlID0ge30pKTtcbihmdW5jdGlvbiAoUm9vdCkge1xuICAgIFJvb3RbUm9vdFtcIkNcIl0gPSAwXSA9IFwiQ1wiO1xuICAgIFJvb3RbUm9vdFtcIkNfU0hBUlBcIl0gPSAxXSA9IFwiQ19TSEFSUFwiO1xuICAgIFJvb3RbUm9vdFtcIkRfRkxBVFwiXSA9IDEgLyogQ19TSEFSUCAqL10gPSBcIkRfRkxBVFwiO1xuICAgIFJvb3RbUm9vdFtcIkRcIl0gPSAyXSA9IFwiRFwiO1xuICAgIFJvb3RbUm9vdFtcIkRfU0hBUlBcIl0gPSAzXSA9IFwiRF9TSEFSUFwiO1xuICAgIFJvb3RbUm9vdFtcIkVfRkxBVFwiXSA9IDMgLyogRF9TSEFSUCAqL10gPSBcIkVfRkxBVFwiO1xuICAgIFJvb3RbUm9vdFtcIkVcIl0gPSA0XSA9IFwiRVwiO1xuICAgIFJvb3RbUm9vdFtcIkVfU0hBUlBcIl0gPSA1IC8qIEYgKi9dID0gXCJFX1NIQVJQXCI7XG4gICAgUm9vdFtSb290W1wiRl9GTEFUXCJdID0gNCAvKiBFICovXSA9IFwiRl9GTEFUXCI7XG4gICAgUm9vdFtSb290W1wiRlwiXSA9IDVdID0gXCJGXCI7XG4gICAgUm9vdFtSb290W1wiRl9TSEFSUFwiXSA9IDZdID0gXCJGX1NIQVJQXCI7XG4gICAgUm9vdFtSb290W1wiR19GTEFUXCJdID0gNiAvKiBGX1NIQVJQICovXSA9IFwiR19GTEFUXCI7XG4gICAgUm9vdFtSb290W1wiR1wiXSA9IDddID0gXCJHXCI7XG4gICAgUm9vdFtSb290W1wiR19TSEFSUFwiXSA9IDhdID0gXCJHX1NIQVJQXCI7XG4gICAgUm9vdFtSb290W1wiQV9GTEFUXCJdID0gOCAvKiBHX1NIQVJQICovXSA9IFwiQV9GTEFUXCI7XG4gICAgUm9vdFtSb290W1wiQVwiXSA9IDldID0gXCJBXCI7XG4gICAgUm9vdFtSb290W1wiQV9TSEFSUFwiXSA9IDEwXSA9IFwiQV9TSEFSUFwiO1xuICAgIFJvb3RbUm9vdFtcIkJfRkxBVFwiXSA9IDEwIC8qIEFfU0hBUlAgKi9dID0gXCJCX0ZMQVRcIjtcbiAgICBSb290W1Jvb3RbXCJCXCJdID0gMTFdID0gXCJCXCI7XG4gICAgUm9vdFtSb290W1wiQl9TSEFSUFwiXSA9IDAgLyogQyAqL10gPSBcIkJfU0hBUlBcIjtcbiAgICBSb290W1Jvb3RbXCJDX0ZMQVRcIl0gPSAxMSAvKiBCICovXSA9IFwiQ19GTEFUXCI7XG59KShleHBvcnRzLlJvb3QgfHwgKGV4cG9ydHMuUm9vdCA9IHt9KSk7XG52YXIgUm9vdCA9IGV4cG9ydHMuUm9vdDtcbnZhciBtaWRpT3JkZXIgPSBbXG4gICAgMCAvKiBDICovLFxuICAgIDEgLyogQ19TSEFSUCAqLyxcbiAgICAyIC8qIEQgKi8sXG4gICAgMyAvKiBEX1NIQVJQICovLFxuICAgIDQgLyogRSAqLyxcbiAgICA1IC8qIEYgKi8sXG4gICAgNiAvKiBGX1NIQVJQICovLFxuICAgIDcgLyogRyAqLyxcbiAgICA4IC8qIEdfU0hBUlAgKi8sXG4gICAgOSAvKiBBICovLFxuICAgIDEwIC8qIEFfU0hBUlAgKi8sXG4gICAgMTEgLyogQiAqL1xuXTtcbnZhciByZXZlcnNlTWlkaU9yZGVyID0ge1xuICAgICdDJzogMCxcbiAgICAnQyMnOiAxLFxuICAgICdEJzogMixcbiAgICAnRCMnOiAzLFxuICAgICdFJzogNCxcbiAgICAnRic6IDUsXG4gICAgJ0YjJzogNixcbiAgICAnRyc6IDcsXG4gICAgJ0cjJzogOCxcbiAgICAnQSc6IDksXG4gICAgJ0EjJzogMTAsXG4gICAgJ0InOiAxMVxufTtcbiIsIi8qKlxuICogQ3JlYXRlZCBieSBLZXZpbiBvbiA0LzE0LzIwMTUuXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi90eXBpbmdzL2Jhc2ljLmQudHNcIiAvPlxuZXhwb3J0cy5maWx0ZXJzID0ge1xuICAgIG11bHRpcGx5KG9yaWdpbmFsMSwgb3JpZ2luYWwyKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3JpZ2luYWwyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IG9yaWdpbmFsMiB8fCB7fTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5mdW5jID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbDIgPSBvcHRpb25zLmZ1bmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSAwLjU7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG9wdGlvbnMudmFsdWUgfHwgMC41O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5wbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsMSh0aW1lLCBoZXJ0eikgKiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhwb3J0cy5wbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbDEodGltZSwgaGVydHopICogb3JpZ2luYWwyKHRpbWUsIGhlcnR6KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBhZGQob3JpZ2luYWwxLCBvcmlnaW5hbDIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcmlnaW5hbDIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbDEodGltZSwgaGVydHopICsgb3JpZ2luYWwyKHRpbWUsIGhlcnR6KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsMSh0aW1lLCBoZXJ0eikgKyBvcmlnaW5hbDI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGV0dW5lKG9yaWdpbmFsLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB2YXIgYW1vdW50ID0gMC41O1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIGFtb3VudCA9IG9wdGlvbnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhbW91bnQgPSBvcHRpb25zLmFtb3VudCB8fCAwLjU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN5bmNoID0gdHlwZW9mIG9wdGlvbnMuc3luY2ggPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc3luY2ggOiB0cnVlO1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5wbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcbiAgICAgICAgICAgIHZhciBsb2NhbEFtb3VudCA9IGFtb3VudDtcbiAgICAgICAgICAgIGlmIChzeW5jaCkge1xuICAgICAgICAgICAgICAgIGxvY2FsQW1vdW50ICo9IGhlcnR6O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsKHRpbWUsIGhlcnR6ICsgbG9jYWxBbW91bnQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHBoYXNlKG9yaWdpbmFsLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB2YXIgc2hpZnQgPSAwLjU7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgc2hpZnQgPSBvcHRpb25zO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2hpZnQgPSBvcHRpb25zLnNoaWZ0IHx8IDAuNTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3luY2ggPSB0eXBlb2Ygb3B0aW9ucy5zeW5jaCA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zeW5jaCA6IHRydWU7XG4gICAgICAgIHJldHVybiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICAgICAgdmFyIGxvY2FsU2hpZnQgPSBzaGlmdDtcbiAgICAgICAgICAgIGlmIChzeW5jaCkge1xuICAgICAgICAgICAgICAgIGxvY2FsU2hpZnQgKj0gMSAvIGhlcnR6O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsKHRpbWUgKyBsb2NhbFNoaWZ0LCBoZXJ0eik7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgYml0Y3J1c2gob3JpZ2luYWwsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIHZhciBiaXRzID0gTWF0aC5mbG9vcihvcHRpb25zLmJpdHMgfHwgOCk7XG4gICAgICAgIHJldHVybiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gb3JpZ2luYWwodGltZSwgaGVydHopO1xuICAgICAgICAgICAgdmFyIGludFZhbHVlID0gTWF0aC5yb3VuZCgodmFsdWUgKyAxKSAvIDIgKiBiaXRzKTtcbiAgICAgICAgICAgIHJldHVybiAoaW50VmFsdWUgLyBiaXRzICogMikgLSAxO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGZsYXRSZXNhbXBsZShvcmlnaW5hbCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgb3B0aW9ucy5yYXRlID0gTWF0aC5mbG9vcihvcHRpb25zLnJhdGUgfHwgNDQxMCk7XG4gICAgICAgIHJldHVybiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICAgICAgdmFyIGludFRpbWUgPSBNYXRoLmZsb29yKHRpbWUgKiBvcHRpb25zLnJhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsKGludFRpbWUgLyBvcHRpb25zLnJhdGUsIGhlcnR6KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBzbG9wZVJlc2FtcGxlKG9yaWdpbmFsLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBvcHRpb25zLnJhdGUgPSBNYXRoLmZsb29yKG9wdGlvbnMucmF0ZSB8fCA0NDEwKTtcbiAgICAgICAgcmV0dXJuIGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgICAgICB2YXIgYmV0d2VlbiA9IHRpbWUgKiBvcHRpb25zLnJhdGU7XG4gICAgICAgICAgICB2YXIgaW50VGltZSA9IE1hdGguZmxvb3IoYmV0d2Vlbik7XG4gICAgICAgICAgICBiZXR3ZWVuID0gYmV0d2VlbiAlIDE7XG4gICAgICAgICAgICB2YXIgZmlyc3QgPSBvcmlnaW5hbChpbnRUaW1lIC8gb3B0aW9ucy5yYXRlLCBoZXJ0eik7XG4gICAgICAgICAgICB2YXIgc2Vjb25kID0gb3JpZ2luYWwoKGludFRpbWUgKyAxKSAvIG9wdGlvbnMucmF0ZSwgaGVydHopO1xuICAgICAgICAgICAgcmV0dXJuIChzZWNvbmQgKiBiZXR3ZWVuKSArIChmaXJzdCAqICgxIC0gYmV0d2VlbikpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGNyYXp5VG93bihvcmlnaW5hbCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgdmFyIHZhcmlhbmNlID0gdHlwZW9mIG9wdGlvbnMudmFyaWFuY2UgPT09ICdudW1iZXInID8gb3B0aW9ucy52YXJpYW5jZSA6IDEwO1xuICAgICAgICB2YXIgcmF0ZSA9IHR5cGVvZiBvcHRpb25zLnJhdGUgPT09ICdudW1iZXInID8gb3B0aW9ucy5yYXRlIDogMTAwO1xuICAgICAgICB2YXIgc3luY2ggPSB0eXBlb2Ygb3B0aW9ucy5zeW5jaCA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zeW5jaCA6IHRydWU7XG4gICAgICAgIHZhciB2YWx1ZUZ1bmMgPSBvcHRpb25zLnZhbHVlRnVuYyB8fCBleHBvcnRzLm9zY2lsbGF0aW9ucy5zaW5lO1xuICAgICAgICByZXR1cm4gZXhwb3J0cy5wbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZVJhdGUgPSByYXRlO1xuICAgICAgICAgICAgaWYgKHN5bmNoKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVSYXRlID0gcmF0ZSAqIGhlcnR6O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5ld0hlcnR6ID0gaGVydHogKyB2YWx1ZUZ1bmModGltZSwgdmFsdWVSYXRlKSAqIHZhcmlhbmNlO1xuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsKHRpbWUsIG5ld0hlcnR6KTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBjcm9zc1BsYXRlKG9yaWdpbmFsMSwgb3JpZ2luYWwyLCBvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICB2YXIgaGlnaEZyZXEgPSBvcHRpb25zLmhpZ2hGcmVxIHx8IDg7XG4gICAgICAgIHZhciBzeW5jaCA9IHR5cGVvZiBvcHRpb25zLnN5bmNoID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN5bmNoIDogdHJ1ZTtcbiAgICAgICAgdmFyIGhpZ2hGdW5jID0gb3B0aW9ucy5oaWdoRnVuYyB8fCBleHBvcnRzLm9zY2lsbGF0aW9ucy50cmlhbmdsZTtcbiAgICAgICAgcmV0dXJuIGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgICAgICB2YXIgc3VwZXJGcmVxID0gaGlnaEZyZXE7XG4gICAgICAgICAgICBpZiAoc3luY2gpIHtcbiAgICAgICAgICAgICAgICBzdXBlckZyZXEgKj0gaGVydHo7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgc3VwZXJWYWwgPSAoaGlnaEZ1bmModGltZSwgc3VwZXJGcmVxKSArIDEpIC8gMjtcbiAgICAgICAgICAgIHZhciB2YWwxID0gb3JpZ2luYWwxKHRpbWUsIGhlcnR6KTtcbiAgICAgICAgICAgIHZhciB2YWwyID0gb3JpZ2luYWwyKHRpbWUsIGhlcnR6KTtcbiAgICAgICAgICAgIHJldHVybiBzdXBlclZhbCAqICh2YWwxIC0gdmFsMikgKyB2YWwyO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuZXhwb3J0cy5wbGF0ZSA9IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgZm9yICh2YXIgbmFtZSBpbiBleHBvcnRzLmZpbHRlcnMpIHtcbiAgICAgICAgaWYgKGV4cG9ydHMuZmlsdGVycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgKGZ1bmN0aW9uIChsb2NhbE5hbWUpIHtcbiAgICAgICAgICAgICAgICBmdW5jW2xvY2FsTmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW2Z1bmNdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cG9ydHMuZmlsdGVyc1tsb2NhbE5hbWVdLmFwcGx5KHdpbmRvdywgYXJncyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pKG5hbWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmdW5jO1xufTtcbmV4cG9ydHMub3NjaWxsYXRpb25zID0ge1xuICAgIHNpbmU6IGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNpbih0aW1lICogaGVydHogKiAyICogTWF0aC5QSSk7XG4gICAgfSksXG4gICAgc3F1YXJlOiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICByZXR1cm4gKHRpbWUgKiBoZXJ0eikgJSAxIDwgMC41ID8gMSA6IC0xO1xuICAgIH0pLFxuICAgIHRyaWFuZ2xlOiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICB2YXIgc2xvcGUgPSAodGltZSAqIGhlcnR6KSAlIDE7XG4gICAgICAgIHJldHVybiBzbG9wZSA8IDAuNSA/IHNsb3BlICogNCAtIDEgOiBzbG9wZSAqIC00ICsgMztcbiAgICB9KSxcbiAgICByb3VnaE1hdGg6IGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgIHJldHVybiBNYXRoLnBvdygoZXhwb3J0cy5vc2NpbGxhdGlvbnMuc2luZSh0aW1lIC0gKDAuMjUgLyBoZXJ0eiksIGhlcnR6KSArIDEpIC8gMiwgMSAvIDIpICogMiAtIDE7XG4gICAgfSksXG4gICAgcm91Z2hNYXRoMjogZXhwb3J0cy5wbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcbiAgICAgICAgaGVydHogPSBoZXJ0eiAvIDI7XG4gICAgICAgIHJldHVybiAoZXhwb3J0cy5vc2NpbGxhdGlvbnMuc2luZSh0aW1lLCBoZXJ0eikgKyBleHBvcnRzLm9zY2lsbGF0aW9ucy5zYXd0b290aCh0aW1lLCBoZXJ0eikpICogZXhwb3J0cy5vc2NpbGxhdGlvbnMudHJpYW5nbGUodGltZSArICgwLjI1IC8gaGVydHopLCBoZXJ0eikgKiAzIC0gMC41O1xuICAgIH0pLFxuICAgIHJvdWdoTWF0aDM6IGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgIHZhciBzbG9wZSA9ICh0aW1lICogaGVydHopICUgMTtcbiAgICAgICAgcmV0dXJuIE1hdGguc2luaCgoc2xvcGUgKiAyIC0gMSkgKiA1KSAqIDAuMDEzODtcbiAgICB9KSxcbiAgICByb3VnaE1hdGg0OiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICB0aW1lID0gdGltZSAqIDI7XG4gICAgICAgIHZhciBzbG9wZSA9ICh0aW1lICogaGVydHopO1xuICAgICAgICB2YXIgdmFsID0gTWF0aC5zaW5oKCgoc2xvcGUgJSAxKSAqIDIgLSAxKSAqIDUpICogMC4wMTM4O1xuICAgICAgICByZXR1cm4gc2xvcGUgJSAyIDwgMSA/IHZhbCA6IC12YWw7XG4gICAgfSksXG4gICAgc2F3dG9vdGg6IGV4cG9ydHMucGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XG4gICAgICAgIHJldHVybiAoKHRpbWUgKiBoZXJ0eikgJSAxKSAqIDIgLSAxO1xuICAgIH0pLFxuICAgIGZyb21WYWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIG5vaXNlOiBleHBvcnRzLnBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xuICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xuICAgIH0pXG59O1xuIiwidmFyIF9fZXh0ZW5kcyA9IHRoaXMuX19leHRlbmRzIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGU7XG4gICAgZC5wcm90b3R5cGUgPSBuZXcgX18oKTtcbn07XG4vKipcbiAqIENyZWF0ZWQgYnkgS2V2aW4gb24gNC8xNC8yMDE1LlxuICovXG52YXIgU3JjID0gcmVxdWlyZSgnLi9Tb3VyY2UnKTtcbnZhciBTYW1wbGVTb3VyY2UgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhTYW1wbGVTb3VyY2UsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gU2FtcGxlU291cmNlKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHNhbXBsZSA9IG9wdGlvbnMuc2FtcGxlO1xuICAgICAgICB2YXIgcmVwZWF0ID0gb3B0aW9ucy5yZXBlYXQ7XG4gICAgICAgIHZhciByZXF1ZXN0RGF0YTtcbiAgICAgICAgaWYgKHJlcGVhdCkge1xuICAgICAgICAgICAgcmVxdWVzdERhdGEgPSBmdW5jdGlvbiAoc3RhcnRQb2ludCwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN1YlNhbXBsZSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ViU2FtcGxlLnB1c2goc2FtcGxlWyhpICsgc3RhcnRQb2ludCkgJSBzYW1wbGUubGVuZ3RoXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBzdWJTYW1wbGU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVxdWVzdERhdGEgPSBmdW5jdGlvbiAoc3RhcnRQb2ludCwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN1YlNhbXBsZSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgc3ViU2FtcGxlLnB1c2goc2FtcGxlW2kgKyBzdGFydFBvaW50XSB8fCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YlNhbXBsZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgeyByZXF1ZXN0RGF0YTogcmVxdWVzdERhdGEgfSk7XG4gICAgfVxuICAgIHJldHVybiBTYW1wbGVTb3VyY2U7XG59KShTcmMuU291cmNlKTtcbmV4cG9ydHMuU2FtcGxlU291cmNlID0gU2FtcGxlU291cmNlO1xuIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IEtldmluIG9uIDQvMTQvMjAxNS5cbiAqL1xudmFyIFNvdXJjZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU291cmNlKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0RGF0YSA9IG9wdGlvbnMucmVxdWVzdERhdGE7XG4gICAgfVxuICAgIHJldHVybiBTb3VyY2U7XG59KSgpO1xuZXhwb3J0cy5Tb3VyY2UgPSBTb3VyY2U7XG4iLCJ2YXIgX19leHRlbmRzID0gdGhpcy5fX2V4dGVuZHMgfHwgZnVuY3Rpb24gKGQsIGIpIHtcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICBfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZTtcbiAgICBkLnByb3RvdHlwZSA9IG5ldyBfXygpO1xufTtcbi8qKlxuICogQ3JlYXRlZCBieSBLZXZpbiBvbiA0LzE0LzIwMTUuXG4gKi9cbnZhciBTcmMgPSByZXF1aXJlKCcuL1NvdXJjZScpO1xudmFyIFZhcmlhYmxlU291cmNlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoVmFyaWFibGVTb3VyY2UsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVmFyaWFibGVTb3VyY2Uob3B0aW9ucykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBleHBlY3RlZERhdGEgPSBvcHRpb25zLmV4cGVjdGVkRGF0YSB8fCBbXTtcbiAgICAgICAgdmFyIHZhcmlhYmxlUmVxdWVzdERhdGEgPSBvcHRpb25zLnJlcXVlc3REYXRhO1xuICAgICAgICB0aGlzLmRhdGEgPSBvcHRpb25zLmRhdGEgfHwge307XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZXhwZWN0ZWREYXRhJywgeyB2YWx1ZTogZXhwZWN0ZWREYXRhIH0pO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCB7XG4gICAgICAgICAgICByZXF1ZXN0RGF0YTogZnVuY3Rpb24gKHN0YXJ0UG9pbnQsIGxlbmd0aCwgc2FtcGxlUmF0ZSwgdG1wRGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YXJpYWJsZVJlcXVlc3REYXRhKHN0YXJ0UG9pbnQsIGxlbmd0aCwgc2FtcGxlUmF0ZSwgdG1wRGF0YSB8fCBzZWxmLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiBWYXJpYWJsZVNvdXJjZTtcbn0pKFNyYy5Tb3VyY2UpO1xuZXhwb3J0cy5WYXJpYWJsZVNvdXJjZSA9IFZhcmlhYmxlU291cmNlO1xuIl19
