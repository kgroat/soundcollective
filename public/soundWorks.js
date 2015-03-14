(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var context = require('./SingletonAudioContext');
var SampleSource = require('./SampleSource');

function BufferedSound(options){
    if(this instanceof BufferedSound){
        BufferedSound.init.call(this, options);
        return this;
    } else {
        return new BufferedSound(options);
    }
}

BufferedSound.init = function(options){
    options = options || {};
    options.duration = options.duration || 1;

    var buffer = context.createBuffer(1, parseInt(options.duration * 44100), 44100);
    var gainNode = context.createGain();
    gainNode.connect(context.destination);
    var source = undefined;

    this.duration = buffer.duration;
    this.length = buffer.length;
    this.sampleRate = buffer.sampleRate;

    Object.defineProperty(this, 'volume', { get: function() { return gainNode.gain.value; }, set: function(val) { return gainNode.gain.value = val; } });
    Object.defineProperty(this, 'isPlaying', { get: function() { return source !== undefined; } });

    function createSource (){
        source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        return source;
    }

    this.loop = function(){
        this.stop();
        var mySource = createSource();
        mySource.loop = true;
        mySource.start();
    };

    this.stop = function(){
        if(source !== undefined){
            source.stop();
            source = undefined;
        }
    }

    this.loopEnqueue = function(data, startIndex, bufferStartIndex, length){
        var channelData = buffer.getChannelData(0);
        startIndex = startIndex || 0;
        bufferStartIndex = bufferStartIndex || 0;
        length = length || data.length - startIndex;
        for(var i=0; i<length; i++){
            var dataIndex = (i + startIndex)%data.length;
            var bufferIndex = (i + bufferStartIndex)%buffer.length;
            channelData[bufferIndex] = data[dataIndex];
        }
    }

    this.enqueue = function(data, startIndex, bufferStartIndex, length){
        var channelData = buffer.getChannelData(0);
        startIndex = startIndex || 0;
        bufferStartIndex = bufferStartIndex || 0;
        length = length || data.length - startIndex;

        if(startIndex + length > data.length){
            console.error('Index ' + (startIndex + length) + ' falls outside of the bounds of the input data.');
        }
        if(bufferStartIndex + length > buffer.length){
            console.error('Index ' + (bufferStartIndex + length) + ' falls outside of the bounds of the buffer data.');
        }
        if(startIndex + length > data.length || bufferStartIndex + length > channelData.length){
            return;
        }

        for(var i=0; i<length; i++){
            var dataIndex = i + startIndex;
            var bufferIndex = i + bufferStartIndex;
            channelData[bufferIndex] = data[dataIndex];
        }
    }
};

Object.freeze(BufferedSound);

module.exports = BufferedSound;
},{"./SampleSource":6,"./SingletonAudioContext":7}],2:[function(require,module,exports){
var midiBridge = window.midiBridge;

var midiHelpers = require('./midiHelpers');
var MidiState = require('./MidiState');

var adapterList = [];
var midiInitialized = false;
var midi = undefined;
var inputs = [];

var KEY_DOWN = 156;
var KEY_UP = 140;

var setupInputs = function(){
    inputs = midi.inputs();
    inputs[0].onmidimessage = function(ev){
        for(var i in adapterList){
            adapterList[i].fireEvent(ev);
        }
    }
}

var initializeMidi = function(){
    if(midiInitialized){
        return;
    }

    navigator.requestMIDIAccess()
        .then(function(midiAccess) {
            midi = midiAccess;
            setupInputs();
        },
        function(){
            console.log('failed to initialize midi adapter');
        });

    midiInitialized = true;
}

function MidiAdapter(options){
    if(this instanceof MidiAdapter){
        MidiAdapter.init.call(this, options);
        return this;
    } else {
        return new MidiAdapter(options);
    }
}

MidiAdapter.init = function(options){
    options = options || {};
    initializeMidi();

    var setState = undefined;
    var midiState = new MidiState({
        exposeSetter: function(setter){
            setState = setter;
        }
    });

    var callback = options.stateChange || undefined;

    this.onStateChange = function(newCallback){
        callback = newCallback;
    };

    this.offStateChange = function(){
        callback = undefined;
    };

    this.fireEvent = function(event){
        var note = midiHelpers.standardize(event.data[1]);
        var noteValueChange = false;
        var newValue = false;
        if(event.data[0] === KEY_DOWN) {
            newValue = new Date().getTime();
            noteValueChange = true;
        } else if(event.data[0] === KEY_UP) {
            newValue = false;
            noteValueChange = true;
        }
        if(noteValueChange) {
            setState(note, newValue);
            if (typeof callback === 'function') {
                callback(note, newValue);
            }
        }
    };

    Object.defineProperty(this, 'state', { get: function() { return midiState; } });
    Object.defineProperty(this, 'checkState', { get: function() { return midiState.checkState; } });

    adapterList.push(this);
};

Object.freeze(MidiAdapter);

module.exports = MidiAdapter;
},{"./MidiState":4,"./midiHelpers":13}],3:[function(require,module,exports){
var helpers = require('./helpers');
var midiHelpers = require('./midiHelpers');
var MidiState = require('./MidiState');
var Source = require('./Source');
var VariableSource = require('./VariableSource');
var Oscillator = require('./Oscillator');

var sourceOscillator = new Oscillator({ oscillation: Oscillator.oscillations.sine });
var defaultSource = sourceOscillator.getStreamSource();

function MidiSource(options){
    if(this instanceof MidiSource){
        MidiSource.init.call(this, options);
        return this;
    } else {
        return new MidiSource(options);
    }
}

MidiSource.init = function(options){
    if(!options || !(options.midiState instanceof MidiState)){
        throw new Error('A MidiSource requires a MidiState called midiState');
    }
    var self = this;

    var midiState = options.midiState;
    this.sourceSound = options.sourceSound instanceof VariableSource ? options.sourceSound : defaultSource;

    helpers.extend(this, new Source({
        requestData:function(startPoint, length, sampleRate){
            var totalData = undefined;
            var currentState = midiState.getAllOn();
            var voices = 0;
            for(var each in currentState){
                if(currentState.hasOwnProperty(each)){
                    voices++;
                    var singleData = self.sourceSound.requestData(startPoint, length, sampleRate, { frequency: midiHelpers.getFrequency(each) });
                    if(totalData === undefined){
                        totalData = singleData;
                    } else {
                        for(var i in totalData){
                            totalData[i] += singleData[i];
                        }
                    }
                }
            }
            if(!totalData){
                totalData = [];
                for(var i=0; i<length; i++){
                    totalData.push(0);
                }
            }
            if(voices > 1){
                for(var i=0; i<length; i++){
                    totalData[i] /= voices;
                }
            }
            return totalData;
        }
    }));
};

helpers.extend(MidiSource.prototype, Source.prototype);

Object.freeze(MidiSource);

module.exports = MidiSource;
},{"./MidiState":4,"./Oscillator":5,"./Source":8,"./VariableSource":10,"./helpers":12,"./midiHelpers":13}],4:[function(require,module,exports){
var midiHelpers = require('./midiHelpers');

function MidiState(options){
    if(this instanceof MidiState){
        MidiState.init.call(this, options);
        return this;
    } else {
        return new MidiState(options);
    }
}

MidiState.init = function(options){
    options = options || {};
    var privateState = {};
    var setState = function(note, value){
        note = midiHelpers.standardize(note);
        if(!value){
            delete  privateState[note];
        }
        privateState[note] = value;
    };

    if(typeof options.exposeSetter === 'function'){
        options.exposeSetter(setState);
    }

    this.checkState = function(note){
        note = midiHelpers.standardize(note);
        return privateState[note] || false;
    }

    this.getAllOn = function(){
        var values = {};
        for(var note in privateState){
            if(privateState.hasOwnProperty(note) && privateState[note]){
                values[note] = privateState[note];
            }
        }
        return values;
    }
};

Object.freeze(MidiState);

module.exports = MidiState;
},{"./midiHelpers":13}],5:[function(require,module,exports){
var VariableSource = require('./VariableSource');

function Oscillator(options){
    if(this instanceof Oscillator){
        Oscillator.init.call(this, options);
        return this;
    } else {
        return new Oscillator(options);
    }
}

Oscillator.init = function(options){
    options = options || {};
    var oscillation = options.oscillation || Oscillator.oscillations.sine;
    Object.defineProperty(this, 'oscillation', { get: function() { return oscillation; } });
    this.getStreamSource = function(hertz){
        return new VariableSource({
            data: { frequency: hertz },
            expectedData: ['frequency'],
            requestData: function(startPoint, length, sampleRate, options){
                sampleRate = sampleRate || 44100;
                var startTime = startPoint / sampleRate;
                var data = [];
                for(var i=0; i<length; i++){
                    data.push(oscillation(startTime + (i / sampleRate), options.frequency));
                }
                return data;
            }
        });
    };
};

Oscillator.filters = {
    multiply: function(original1, original2){
        if(typeof original2 !== 'function'){
            var options = original2 || {};
            if(typeof options.func === "function"){
                original2 = options.func;
            } else {
                var value = 0.5;
                if(typeof options === 'number'){
                    value = options;
                } else {
                    value = options.value || 0.5;
                }
                return plate(function(time, hertz){
                    return original1(time, hertz) * value;
                });
            }
        }
        return plate(function(time, hertz){
            return original1(time, hertz) * original2(time, hertz);
        });
    },
    add: function(original1, original2){
        if(typeof original2 === 'function') {
            return plate(function (time, hertz) {
                return original1(time, hertz) + original2(time, hertz);
            });
        } else {
            return plate(function (time, hertz) {
                return original1(time, hertz) + original2;
            });
        }
    },
    detune: function(original, options){
        options = options || {};
        var amount = 0.5;
        if(typeof options === "number"){
            amount = options;
        } else {
            amount = options.amount || 0.5;
        }
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        return plate(function(time, hertz){
            var localAmount = amount;
            if(synch){
                localAmount *= hertz;
            }
            return original(time, hertz + localAmount);
        });
    },
    phase: function(original, options){
        options = options || {};
        var shift = 0.5;
        if(typeof options === "number"){
            shift = options;
        } else {
            shift = options.shift || 0.5;
        }
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        return plate(function(time, hertz){
            var localShift = shift;
            if(synch){
                localShift *= 1/hertz;
            }
            return original(time + localShift, hertz);
        });
    },
    bitcrush: function(original, options){
        options = options || {};
        var bits = parseInt(options.bits || 8);
        return plate(function(time, hertz){
            var value = original(time, hertz);
            var intValue = Math.round((value + 1) / 2 * bits);
            return (intValue / bits * 2) - 1;
        });
    },
    flatResample: function(original, options) {
        options = options || {};
        options.rate = parseInt(options.rate || 4410);
        return plate(function (time, hertz) {
            var intTime = parseInt(time * options.rate);
            return original(intTime / options.rate, hertz);
        });
    },
    slopeResample: function(original, options) {
        options = options || {};
        options.rate = parseInt(options.rate || 4410);
        return plate(function (time, hertz) {
            var between = time * options.rate;
            var intTime = parseInt(between);
            between = between % 1;
            var first = original(intTime / options.rate, hertz);
            var second = original((intTime + 1) / options.rate, hertz);
            return (second * between) + (first * (1 - between));
        });
    },
    crazyTown: function(original, options) {
        options = options || {};
        var variance = typeof options.variance === 'number' ? options.variance : 10;
        var rate = typeof options.rate === 'number' ? options.rate : 100;
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        var valueFunc = options.valueFunc || Oscillator.oscillations.sine;
        return plate(function (time, hertz) {
            var valueRate = rate;
            if(synch){
                valueRate = rate * hertz;
            }
            var newHertz = hertz + valueFunc(time, valueRate) * variance;
            return original(time, newHertz);
        });
    },
    crossPlate: function(original1, original2, options) {
        options = options || {};
        var highFreq = options.highFreq || 8;
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        var highFunc = options.highFunc || Oscillator.oscillations.triangle;
        return plate(function (time, hertz) {
            var superFreq = highFreq;
            if(synch){
                superFreq *= hertz;
            }
            var superVal = (highFunc(time, superFreq) + 1)/2;
            var val1 = original1(time, hertz);
            var val2 = original2(time, hertz);
            return superVal * (val1 - val2) + val2;
        });
    }
};

var plate = function(func){
    for(var name in Oscillator.filters){
        if(Oscillator.filters.hasOwnProperty(name)){
            (function(localName) {
                func[localName] = function () {
                    var args = [func];
                    for (var i = 0; i < arguments.length; i++) {
                        args.push(arguments[i]);
                    }
                    return Oscillator.filters[localName].apply(window, args);
                };
            })(name);
        }
    }
    return func;
}

Oscillator.oscillations = {
    sine: plate(function(time, hertz){
        return Math.sin(time * hertz * 2 * Math.PI);
    }),
    square: plate(function(time, hertz){
        return (time * hertz) % 1 < 0.5 ? 1 : -1;
    }),
    triangle: plate(function(time, hertz){
        var slope = (time* hertz) % 1;
        return slope < 0.5 ? slope * 4 - 1 : slope * -4 + 3;
    }),
    roughMath: plate(function(time, hertz){
        return Math.pow((Oscillator.oscillations.sine(time - (0.25 / hertz), hertz) + 1) / 2, 1/2) * 2 - 1
    }),
    roughMath2: plate(function(time, hertz){
        hertz = hertz / 2;
        return (Oscillator.oscillations.sine(time, hertz) + Oscillator.oscillations.sawtooth(time, hertz)) * Oscillator.oscillations.triangle(time + (0.25 / hertz), hertz) * 3 - 0.5;
    }),
    roughMath3: plate(function(time, hertz){
        var slope = (time * hertz) % 1;
        return Math.sinh((slope*2 - 1)*5) * 0.0138;
    }),
    roughMath4: plate(function(time, hertz){
        time = time * 2;
        var slope = (time * hertz);
        var val = Math.sinh(((slope%1)*2 - 1)*5) * 0.0138;
        return slope%2 < 1 ? val : - val;
    }),
    sawtooth: plate(function(time, hertz){
        return ((time * hertz) % 1) * 2 - 1;
    }),
    fromValue: function(value){
        return plate(function(time, hertz){
            return value;
        });
    },
    noise: plate(function(time, herts){
        return Math.random() * 2 - 1;
    }),
    filters: Oscillator.filters
};

Object.freeze(Oscillator);

module.exports = Oscillator;
},{"./VariableSource":10}],6:[function(require,module,exports){
var helpers = require('./helpers');
var Source = require('./Source');

function SampleSource(options){
    if(this instanceof SampleSource){
        SampleSource.init.call(this, options);
        return this;
    } else {
        return new SampleSource(options);
    }
}

SampleSource.init = function(options){
    options = options || {};
    var sample = options.sample;
    var repeat = options.repeat || false;
    var requestData;
    if(repeat){
        requestData = function(startPoint, length){
            var subSample = [];
            for(var i=0; i<length; i++){
                subSample.push(sample[(i+startPoint)%sample.length]);
            }
            return subSample;
        };
    } else {
        requestData = function(startPoint, length){
            var subSample = [];
            for(var i=0; i<length; i++){
                subSample.push(sample[i+startPoint] || 0);
            }
            return subSample;
        };
    }
    helpers.extend(this, new Source({
        requestData: requestData
    }));
};

helpers.extend(SampleSource.prototype, Source.prototype);

Object.freeze(SampleSource);

module.exports = SampleSource;
},{"./Source":8,"./helpers":12}],7:[function(require,module,exports){
module.exports = window.tmpContext = new AudioContext();
},{}],8:[function(require,module,exports){

function Source(options){
    if(this instanceof Source){
        Source.init.call(this, options);
        return this;
    } else {
        return new Source(options);
    }
}

Source.init = function(options){
    if(!options || typeof options.requestData !== 'function'){
        throw new Error('A SoundSource requires a function named requestData');
    }
    this.requestData = options.requestData;
};

Object.freeze(Source);

module.exports = Source;
},{}],9:[function(require,module,exports){
var Source = require('./Source');
var VariableSource = require('./VariableSource');
var context = require('./SingletonAudioContext');

function SourceSound(options){
    if(this instanceof SourceSound){
        SourceSound.init.call(this, options);
        return this;
    } else {
        return new SourceSound(options);
    }
}

SourceSound.init = function(options){
    if(!options){
        throw new Error("SourceSound requires an options hash to be passed in, with a SourceSound named source");
    }

    if(!(options.source instanceof VariableSource)){
        throw new Error("SourceSound requires a SoundSource named source");
    }

    if((typeof options.delay !== "number" && typeof options.delay !== "undefined") || (typeof options.delay === "number" && options.delay <= 0)){
        throw new Error("If a delay is supplied, it must be a positive number");
    }

    var source = options.source;
    var delay = options.delay || 0.1;
    var bufferCount = options.bufferCount || 3;

    var bufferSize = parseInt(delay * 44100);
    var fullBufferSize = bufferSize * bufferCount;

    var buffer = context.createBuffer(1, fullBufferSize, 44100);

    var gainNode = context.createGain();
    gainNode.connect(context.destination);

    var currentFrame = 0;
    var bufferSource = undefined;

    var timeoutId = 0;
    var lastTime = 0;
    var startTime = 0;

    var isPlaying = false;
    Object.defineProperty(this, 'isPlaying', { get: function() { return isPlaying; } });

    var fillBuffer = function(startingFrame, length, options){
        var channelData = buffer.getChannelData(0);
        var newData = source.requestData(startingFrame, length, 44100, options);
        for(var i=0; i<newData.length; i++){
            channelData[(i + startingFrame) % channelData.length] = newData[i];
        }
    };

    var createBufferSource = function(){
        var output = context.createBufferSource();
        output.buffer = buffer;
        output.loop = true;
        output.connect(gainNode);
        return output;
    };

    var framesElapsed = function(start, end){
        var startFrame = Math.round(start * 44100);
        var endFrame = Math.round(end * 44100);
        return endFrame - startFrame;
    };

    this.play = function(options){
        options = options || {};
        currentFrame = fullBufferSize - (bufferSize / 2);
        fillBuffer(0, fullBufferSize, options);
        var expectedMs = delay * 1000;
        var maxErr = expectedMs * 0.2;
        var minErr = expectedMs * -0.2;
        var timeoutFunc = function(){
            var currentTime = context.currentTime;
            var diffFrames = framesElapsed(lastTime, currentTime);
            var diffTime = currentTime - lastTime;
            lastTime = currentTime;
            if(diffFrames < fullBufferSize) {
                fillBuffer(currentFrame, diffFrames, options);
            } else {
                currentFrame += diffFrames - fullBufferSize;
                fillBuffer(currentFrame, fullBufferSize, options);
            }
            currentFrame += diffFrames;
            var actualMs = diffTime * 1000;
            var errMs = Math.max(minErr, Math.min(actualMs - expectedMs, maxErr));
            timeoutId = setTimeout(timeoutFunc, expectedMs - errMs * 0.9 )
        };
        timeoutId = window.setTimeout(timeoutFunc, delay * 1000 - 10);
        bufferSource = createBufferSource();
        isPlaying = true;
        lastTime = startTime = context.currentTime;
        bufferSource.start();
    };

    this.stop = function(){
        isPlaying = false;
        window.clearTimeout(timeoutId);
        timeoutId = 0;
        bufferSource.stop();
    }
};

Object.freeze(SourceSound);

module.exports = SourceSound;
},{"./SingletonAudioContext":7,"./Source":8,"./VariableSource":10}],10:[function(require,module,exports){
var helpers = require('./helpers');
var Source = require('./Source');

function VariableSource(options){
    if(this instanceof VariableSource){
        VariableSource.init.call(this, options);
        return this;
    } else {
        return new VariableSource(options);
    }
}

VariableSource.init = function(options){
    if(!options || typeof options.requestData !== 'function'){
        throw new Error('A VariableSource requires a function named requestData');
    }
    var self = this;
    var expectedData = options.expectedData || [];
    var variableRequestData = options.requestData;

    this.data = options.data || {};

    Object.defineProperty(this, 'expectedData', { get: function() { return expectedData; } });

    helpers.extend(this, new Source({
        requestData: function(startPoint, length, sampleRate, tmpData){
            return variableRequestData(startPoint, length, sampleRate, tmpData || self.data);
        }
    }))
};

helpers.extend(VariableSource.prototype, Source.prototype);

Object.freeze(VariableSource);

module.exports = VariableSource;
},{"./Source":8,"./helpers":12}],11:[function(require,module,exports){
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
},{"./BufferedSound":1,"./MidiAdapter":2,"./MidiSource":3,"./MidiState":4,"./Oscillator":5,"./SampleSource":6,"./Source":8,"./SourceSound2":9,"./VariableSource":10}],12:[function(require,module,exports){
var usingSetPrototypeOf = function(self, superObject){
    Object.setPrototypeOf(self, superObject);
}

var usingProto = function(self, superObject){
    self.__proto__ = superObject;
}

module.exports = {
    extend: function(self, superObject){
        var originalPrototype = self.__proto__;
        var superConstructorPrototype = superObject.constructor.prototype;
        var setPrototype;
        if(typeof Object.setPrototypeOf === 'function'){
            setPrototype = usingSetPrototypeOf;
        } else {
            setPrototype = usingProto;
        }

        setPrototype(self, superObject);
        var currentPrototype = self;
        while(currentPrototype.__proto__ !== superConstructorPrototype){
            currentPrototype = currentPrototype.__proto__;
        }
        setPrototype(currentPrototype, originalPrototype);
        return self;
    }
}
},{}],13:[function(require,module,exports){
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
},{}]},{},[11])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxEZXZcXHNvdW5kd29ya3NcXG5vZGVfbW9kdWxlc1xcZ3VscC1icm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L0Rldi9zb3VuZHdvcmtzL3NyYy9Tb3VuZFdvcmtzL0J1ZmZlcmVkU291bmQuanMiLCJDOi9EZXYvc291bmR3b3Jrcy9zcmMvU291bmRXb3Jrcy9NaWRpQWRhcHRlci5qcyIsIkM6L0Rldi9zb3VuZHdvcmtzL3NyYy9Tb3VuZFdvcmtzL01pZGlTb3VyY2UuanMiLCJDOi9EZXYvc291bmR3b3Jrcy9zcmMvU291bmRXb3Jrcy9NaWRpU3RhdGUuanMiLCJDOi9EZXYvc291bmR3b3Jrcy9zcmMvU291bmRXb3Jrcy9Pc2NpbGxhdG9yLmpzIiwiQzovRGV2L3NvdW5kd29ya3Mvc3JjL1NvdW5kV29ya3MvU2FtcGxlU291cmNlLmpzIiwiQzovRGV2L3NvdW5kd29ya3Mvc3JjL1NvdW5kV29ya3MvU2luZ2xldG9uQXVkaW9Db250ZXh0LmpzIiwiQzovRGV2L3NvdW5kd29ya3Mvc3JjL1NvdW5kV29ya3MvU291cmNlLmpzIiwiQzovRGV2L3NvdW5kd29ya3Mvc3JjL1NvdW5kV29ya3MvU291cmNlU291bmQyLmpzIiwiQzovRGV2L3NvdW5kd29ya3Mvc3JjL1NvdW5kV29ya3MvVmFyaWFibGVTb3VyY2UuanMiLCJDOi9EZXYvc291bmR3b3Jrcy9zcmMvU291bmRXb3Jrcy9mYWtlX2I0MGM4N2IxLmpzIiwiQzovRGV2L3NvdW5kd29ya3Mvc3JjL1NvdW5kV29ya3MvaGVscGVycy5qcyIsIkM6L0Rldi9zb3VuZHdvcmtzL3NyYy9Tb3VuZFdvcmtzL21pZGlIZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29udGV4dCA9IHJlcXVpcmUoJy4vU2luZ2xldG9uQXVkaW9Db250ZXh0Jyk7XHJcbnZhciBTYW1wbGVTb3VyY2UgPSByZXF1aXJlKCcuL1NhbXBsZVNvdXJjZScpO1xyXG5cclxuZnVuY3Rpb24gQnVmZmVyZWRTb3VuZChvcHRpb25zKXtcclxuICAgIGlmKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXJlZFNvdW5kKXtcclxuICAgICAgICBCdWZmZXJlZFNvdW5kLmluaXQuY2FsbCh0aGlzLCBvcHRpb25zKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCdWZmZXJlZFNvdW5kKG9wdGlvbnMpO1xyXG4gICAgfVxyXG59XHJcblxyXG5CdWZmZXJlZFNvdW5kLmluaXQgPSBmdW5jdGlvbihvcHRpb25zKXtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgb3B0aW9ucy5kdXJhdGlvbiA9IG9wdGlvbnMuZHVyYXRpb24gfHwgMTtcclxuXHJcbiAgICB2YXIgYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMSwgcGFyc2VJbnQob3B0aW9ucy5kdXJhdGlvbiAqIDQ0MTAwKSwgNDQxMDApO1xyXG4gICAgdmFyIGdhaW5Ob2RlID0gY29udGV4dC5jcmVhdGVHYWluKCk7XHJcbiAgICBnYWluTm9kZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xyXG4gICAgdmFyIHNvdXJjZSA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICB0aGlzLmR1cmF0aW9uID0gYnVmZmVyLmR1cmF0aW9uO1xyXG4gICAgdGhpcy5sZW5ndGggPSBidWZmZXIubGVuZ3RoO1xyXG4gICAgdGhpcy5zYW1wbGVSYXRlID0gYnVmZmVyLnNhbXBsZVJhdGU7XHJcblxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICd2b2x1bWUnLCB7IGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBnYWluTm9kZS5nYWluLnZhbHVlOyB9LCBzZXQ6IGZ1bmN0aW9uKHZhbCkgeyByZXR1cm4gZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IHZhbDsgfSB9KTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnaXNQbGF5aW5nJywgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gc291cmNlICE9PSB1bmRlZmluZWQ7IH0gfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlYXRlU291cmNlICgpe1xyXG4gICAgICAgIHNvdXJjZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcbiAgICAgICAgc291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcclxuICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XHJcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmxvb3AgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHRoaXMuc3RvcCgpO1xyXG4gICAgICAgIHZhciBteVNvdXJjZSA9IGNyZWF0ZVNvdXJjZSgpO1xyXG4gICAgICAgIG15U291cmNlLmxvb3AgPSB0cnVlO1xyXG4gICAgICAgIG15U291cmNlLnN0YXJ0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgaWYoc291cmNlICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICBzb3VyY2Uuc3RvcCgpO1xyXG4gICAgICAgICAgICBzb3VyY2UgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9vcEVucXVldWUgPSBmdW5jdGlvbihkYXRhLCBzdGFydEluZGV4LCBidWZmZXJTdGFydEluZGV4LCBsZW5ndGgpe1xyXG4gICAgICAgIHZhciBjaGFubmVsRGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcclxuICAgICAgICBzdGFydEluZGV4ID0gc3RhcnRJbmRleCB8fCAwO1xyXG4gICAgICAgIGJ1ZmZlclN0YXJ0SW5kZXggPSBidWZmZXJTdGFydEluZGV4IHx8IDA7XHJcbiAgICAgICAgbGVuZ3RoID0gbGVuZ3RoIHx8IGRhdGEubGVuZ3RoIC0gc3RhcnRJbmRleDtcclxuICAgICAgICBmb3IodmFyIGk9MDsgaTxsZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgIHZhciBkYXRhSW5kZXggPSAoaSArIHN0YXJ0SW5kZXgpJWRhdGEubGVuZ3RoO1xyXG4gICAgICAgICAgICB2YXIgYnVmZmVySW5kZXggPSAoaSArIGJ1ZmZlclN0YXJ0SW5kZXgpJWJ1ZmZlci5sZW5ndGg7XHJcbiAgICAgICAgICAgIGNoYW5uZWxEYXRhW2J1ZmZlckluZGV4XSA9IGRhdGFbZGF0YUluZGV4XTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5lbnF1ZXVlID0gZnVuY3Rpb24oZGF0YSwgc3RhcnRJbmRleCwgYnVmZmVyU3RhcnRJbmRleCwgbGVuZ3RoKXtcclxuICAgICAgICB2YXIgY2hhbm5lbERhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XHJcbiAgICAgICAgc3RhcnRJbmRleCA9IHN0YXJ0SW5kZXggfHwgMDtcclxuICAgICAgICBidWZmZXJTdGFydEluZGV4ID0gYnVmZmVyU3RhcnRJbmRleCB8fCAwO1xyXG4gICAgICAgIGxlbmd0aCA9IGxlbmd0aCB8fCBkYXRhLmxlbmd0aCAtIHN0YXJ0SW5kZXg7XHJcblxyXG4gICAgICAgIGlmKHN0YXJ0SW5kZXggKyBsZW5ndGggPiBkYXRhLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0luZGV4ICcgKyAoc3RhcnRJbmRleCArIGxlbmd0aCkgKyAnIGZhbGxzIG91dHNpZGUgb2YgdGhlIGJvdW5kcyBvZiB0aGUgaW5wdXQgZGF0YS4nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYnVmZmVyU3RhcnRJbmRleCArIGxlbmd0aCA+IGJ1ZmZlci5sZW5ndGgpe1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbmRleCAnICsgKGJ1ZmZlclN0YXJ0SW5kZXggKyBsZW5ndGgpICsgJyBmYWxscyBvdXRzaWRlIG9mIHRoZSBib3VuZHMgb2YgdGhlIGJ1ZmZlciBkYXRhLicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihzdGFydEluZGV4ICsgbGVuZ3RoID4gZGF0YS5sZW5ndGggfHwgYnVmZmVyU3RhcnRJbmRleCArIGxlbmd0aCA+IGNoYW5uZWxEYXRhLmxlbmd0aCl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvcih2YXIgaT0wOyBpPGxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgdmFyIGRhdGFJbmRleCA9IGkgKyBzdGFydEluZGV4O1xyXG4gICAgICAgICAgICB2YXIgYnVmZmVySW5kZXggPSBpICsgYnVmZmVyU3RhcnRJbmRleDtcclxuICAgICAgICAgICAgY2hhbm5lbERhdGFbYnVmZmVySW5kZXhdID0gZGF0YVtkYXRhSW5kZXhdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuXHJcbk9iamVjdC5mcmVlemUoQnVmZmVyZWRTb3VuZCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlcmVkU291bmQ7IiwidmFyIG1pZGlCcmlkZ2UgPSB3aW5kb3cubWlkaUJyaWRnZTtcclxuXHJcbnZhciBtaWRpSGVscGVycyA9IHJlcXVpcmUoJy4vbWlkaUhlbHBlcnMnKTtcclxudmFyIE1pZGlTdGF0ZSA9IHJlcXVpcmUoJy4vTWlkaVN0YXRlJyk7XHJcblxyXG52YXIgYWRhcHRlckxpc3QgPSBbXTtcclxudmFyIG1pZGlJbml0aWFsaXplZCA9IGZhbHNlO1xyXG52YXIgbWlkaSA9IHVuZGVmaW5lZDtcclxudmFyIGlucHV0cyA9IFtdO1xyXG5cclxudmFyIEtFWV9ET1dOID0gMTU2O1xyXG52YXIgS0VZX1VQID0gMTQwO1xyXG5cclxudmFyIHNldHVwSW5wdXRzID0gZnVuY3Rpb24oKXtcclxuICAgIGlucHV0cyA9IG1pZGkuaW5wdXRzKCk7XHJcbiAgICBpbnB1dHNbMF0ub25taWRpbWVzc2FnZSA9IGZ1bmN0aW9uKGV2KXtcclxuICAgICAgICBmb3IodmFyIGkgaW4gYWRhcHRlckxpc3Qpe1xyXG4gICAgICAgICAgICBhZGFwdGVyTGlzdFtpXS5maXJlRXZlbnQoZXYpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxudmFyIGluaXRpYWxpemVNaWRpID0gZnVuY3Rpb24oKXtcclxuICAgIGlmKG1pZGlJbml0aWFsaXplZCl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIG5hdmlnYXRvci5yZXF1ZXN0TUlESUFjY2VzcygpXHJcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24obWlkaUFjY2Vzcykge1xyXG4gICAgICAgICAgICBtaWRpID0gbWlkaUFjY2VzcztcclxuICAgICAgICAgICAgc2V0dXBJbnB1dHMoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmYWlsZWQgdG8gaW5pdGlhbGl6ZSBtaWRpIGFkYXB0ZXInKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBtaWRpSW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBNaWRpQWRhcHRlcihvcHRpb25zKXtcclxuICAgIGlmKHRoaXMgaW5zdGFuY2VvZiBNaWRpQWRhcHRlcil7XHJcbiAgICAgICAgTWlkaUFkYXB0ZXIuaW5pdC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1pZGlBZGFwdGVyKG9wdGlvbnMpO1xyXG4gICAgfVxyXG59XHJcblxyXG5NaWRpQWRhcHRlci5pbml0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIGluaXRpYWxpemVNaWRpKCk7XHJcblxyXG4gICAgdmFyIHNldFN0YXRlID0gdW5kZWZpbmVkO1xyXG4gICAgdmFyIG1pZGlTdGF0ZSA9IG5ldyBNaWRpU3RhdGUoe1xyXG4gICAgICAgIGV4cG9zZVNldHRlcjogZnVuY3Rpb24oc2V0dGVyKXtcclxuICAgICAgICAgICAgc2V0U3RhdGUgPSBzZXR0ZXI7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgdmFyIGNhbGxiYWNrID0gb3B0aW9ucy5zdGF0ZUNoYW5nZSB8fCB1bmRlZmluZWQ7XHJcblxyXG4gICAgdGhpcy5vblN0YXRlQ2hhbmdlID0gZnVuY3Rpb24obmV3Q2FsbGJhY2spe1xyXG4gICAgICAgIGNhbGxiYWNrID0gbmV3Q2FsbGJhY2s7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMub2ZmU3RhdGVDaGFuZ2UgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGNhbGxiYWNrID0gdW5kZWZpbmVkO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmZpcmVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICB2YXIgbm90ZSA9IG1pZGlIZWxwZXJzLnN0YW5kYXJkaXplKGV2ZW50LmRhdGFbMV0pO1xyXG4gICAgICAgIHZhciBub3RlVmFsdWVDaGFuZ2UgPSBmYWxzZTtcclxuICAgICAgICB2YXIgbmV3VmFsdWUgPSBmYWxzZTtcclxuICAgICAgICBpZihldmVudC5kYXRhWzBdID09PSBLRVlfRE9XTikge1xyXG4gICAgICAgICAgICBuZXdWYWx1ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgICAgICBub3RlVmFsdWVDaGFuZ2UgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSBpZihldmVudC5kYXRhWzBdID09PSBLRVlfVVApIHtcclxuICAgICAgICAgICAgbmV3VmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgbm90ZVZhbHVlQ2hhbmdlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYobm90ZVZhbHVlQ2hhbmdlKSB7XHJcbiAgICAgICAgICAgIHNldFN0YXRlKG5vdGUsIG5ld1ZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobm90ZSwgbmV3VmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N0YXRlJywgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWlkaVN0YXRlOyB9IH0pO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjaGVja1N0YXRlJywgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWlkaVN0YXRlLmNoZWNrU3RhdGU7IH0gfSk7XHJcblxyXG4gICAgYWRhcHRlckxpc3QucHVzaCh0aGlzKTtcclxufTtcclxuXHJcbk9iamVjdC5mcmVlemUoTWlkaUFkYXB0ZXIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaWRpQWRhcHRlcjsiLCJ2YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xyXG52YXIgbWlkaUhlbHBlcnMgPSByZXF1aXJlKCcuL21pZGlIZWxwZXJzJyk7XHJcbnZhciBNaWRpU3RhdGUgPSByZXF1aXJlKCcuL01pZGlTdGF0ZScpO1xyXG52YXIgU291cmNlID0gcmVxdWlyZSgnLi9Tb3VyY2UnKTtcclxudmFyIFZhcmlhYmxlU291cmNlID0gcmVxdWlyZSgnLi9WYXJpYWJsZVNvdXJjZScpO1xyXG52YXIgT3NjaWxsYXRvciA9IHJlcXVpcmUoJy4vT3NjaWxsYXRvcicpO1xyXG5cclxudmFyIHNvdXJjZU9zY2lsbGF0b3IgPSBuZXcgT3NjaWxsYXRvcih7IG9zY2lsbGF0aW9uOiBPc2NpbGxhdG9yLm9zY2lsbGF0aW9ucy5zaW5lIH0pO1xyXG52YXIgZGVmYXVsdFNvdXJjZSA9IHNvdXJjZU9zY2lsbGF0b3IuZ2V0U3RyZWFtU291cmNlKCk7XHJcblxyXG5mdW5jdGlvbiBNaWRpU291cmNlKG9wdGlvbnMpe1xyXG4gICAgaWYodGhpcyBpbnN0YW5jZW9mIE1pZGlTb3VyY2Upe1xyXG4gICAgICAgIE1pZGlTb3VyY2UuaW5pdC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1pZGlTb3VyY2Uob3B0aW9ucyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbk1pZGlTb3VyY2UuaW5pdCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xyXG4gICAgaWYoIW9wdGlvbnMgfHwgIShvcHRpb25zLm1pZGlTdGF0ZSBpbnN0YW5jZW9mIE1pZGlTdGF0ZSkpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQSBNaWRpU291cmNlIHJlcXVpcmVzIGEgTWlkaVN0YXRlIGNhbGxlZCBtaWRpU3RhdGUnKTtcclxuICAgIH1cclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB2YXIgbWlkaVN0YXRlID0gb3B0aW9ucy5taWRpU3RhdGU7XHJcbiAgICB0aGlzLnNvdXJjZVNvdW5kID0gb3B0aW9ucy5zb3VyY2VTb3VuZCBpbnN0YW5jZW9mIFZhcmlhYmxlU291cmNlID8gb3B0aW9ucy5zb3VyY2VTb3VuZCA6IGRlZmF1bHRTb3VyY2U7XHJcblxyXG4gICAgaGVscGVycy5leHRlbmQodGhpcywgbmV3IFNvdXJjZSh7XHJcbiAgICAgICAgcmVxdWVzdERhdGE6ZnVuY3Rpb24oc3RhcnRQb2ludCwgbGVuZ3RoLCBzYW1wbGVSYXRlKXtcclxuICAgICAgICAgICAgdmFyIHRvdGFsRGF0YSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRTdGF0ZSA9IG1pZGlTdGF0ZS5nZXRBbGxPbigpO1xyXG4gICAgICAgICAgICB2YXIgdm9pY2VzID0gMDtcclxuICAgICAgICAgICAgZm9yKHZhciBlYWNoIGluIGN1cnJlbnRTdGF0ZSl7XHJcbiAgICAgICAgICAgICAgICBpZihjdXJyZW50U3RhdGUuaGFzT3duUHJvcGVydHkoZWFjaCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZvaWNlcysrO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzaW5nbGVEYXRhID0gc2VsZi5zb3VyY2VTb3VuZC5yZXF1ZXN0RGF0YShzdGFydFBvaW50LCBsZW5ndGgsIHNhbXBsZVJhdGUsIHsgZnJlcXVlbmN5OiBtaWRpSGVscGVycy5nZXRGcmVxdWVuY3koZWFjaCkgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodG90YWxEYXRhID09PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbERhdGEgPSBzaW5nbGVEYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSBpbiB0b3RhbERhdGEpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxEYXRhW2ldICs9IHNpbmdsZURhdGFbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoIXRvdGFsRGF0YSl7XHJcbiAgICAgICAgICAgICAgICB0b3RhbERhdGEgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPGxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbERhdGEucHVzaCgwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZih2b2ljZXMgPiAxKXtcclxuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPGxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbERhdGFbaV0gLz0gdm9pY2VzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0b3RhbERhdGE7XHJcbiAgICAgICAgfVxyXG4gICAgfSkpO1xyXG59O1xyXG5cclxuaGVscGVycy5leHRlbmQoTWlkaVNvdXJjZS5wcm90b3R5cGUsIFNvdXJjZS5wcm90b3R5cGUpO1xyXG5cclxuT2JqZWN0LmZyZWV6ZShNaWRpU291cmNlKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWlkaVNvdXJjZTsiLCJ2YXIgbWlkaUhlbHBlcnMgPSByZXF1aXJlKCcuL21pZGlIZWxwZXJzJyk7XHJcblxyXG5mdW5jdGlvbiBNaWRpU3RhdGUob3B0aW9ucyl7XHJcbiAgICBpZih0aGlzIGluc3RhbmNlb2YgTWlkaVN0YXRlKXtcclxuICAgICAgICBNaWRpU3RhdGUuaW5pdC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IE1pZGlTdGF0ZShvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG5cclxuTWlkaVN0YXRlLmluaXQgPSBmdW5jdGlvbihvcHRpb25zKXtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgdmFyIHByaXZhdGVTdGF0ZSA9IHt9O1xyXG4gICAgdmFyIHNldFN0YXRlID0gZnVuY3Rpb24obm90ZSwgdmFsdWUpe1xyXG4gICAgICAgIG5vdGUgPSBtaWRpSGVscGVycy5zdGFuZGFyZGl6ZShub3RlKTtcclxuICAgICAgICBpZighdmFsdWUpe1xyXG4gICAgICAgICAgICBkZWxldGUgIHByaXZhdGVTdGF0ZVtub3RlXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJpdmF0ZVN0YXRlW25vdGVdID0gdmFsdWU7XHJcbiAgICB9O1xyXG5cclxuICAgIGlmKHR5cGVvZiBvcHRpb25zLmV4cG9zZVNldHRlciA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgb3B0aW9ucy5leHBvc2VTZXR0ZXIoc2V0U3RhdGUpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY2hlY2tTdGF0ZSA9IGZ1bmN0aW9uKG5vdGUpe1xyXG4gICAgICAgIG5vdGUgPSBtaWRpSGVscGVycy5zdGFuZGFyZGl6ZShub3RlKTtcclxuICAgICAgICByZXR1cm4gcHJpdmF0ZVN0YXRlW25vdGVdIHx8IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZ2V0QWxsT24gPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciB2YWx1ZXMgPSB7fTtcclxuICAgICAgICBmb3IodmFyIG5vdGUgaW4gcHJpdmF0ZVN0YXRlKXtcclxuICAgICAgICAgICAgaWYocHJpdmF0ZVN0YXRlLmhhc093blByb3BlcnR5KG5vdGUpICYmIHByaXZhdGVTdGF0ZVtub3RlXSl7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZXNbbm90ZV0gPSBwcml2YXRlU3RhdGVbbm90ZV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgIH1cclxufTtcclxuXHJcbk9iamVjdC5mcmVlemUoTWlkaVN0YXRlKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWlkaVN0YXRlOyIsInZhciBWYXJpYWJsZVNvdXJjZSA9IHJlcXVpcmUoJy4vVmFyaWFibGVTb3VyY2UnKTtcclxuXHJcbmZ1bmN0aW9uIE9zY2lsbGF0b3Iob3B0aW9ucyl7XHJcbiAgICBpZih0aGlzIGluc3RhbmNlb2YgT3NjaWxsYXRvcil7XHJcbiAgICAgICAgT3NjaWxsYXRvci5pbml0LmNhbGwodGhpcywgb3B0aW9ucyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBuZXcgT3NjaWxsYXRvcihvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG5cclxuT3NjaWxsYXRvci5pbml0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHZhciBvc2NpbGxhdGlvbiA9IG9wdGlvbnMub3NjaWxsYXRpb24gfHwgT3NjaWxsYXRvci5vc2NpbGxhdGlvbnMuc2luZTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnb3NjaWxsYXRpb24nLCB7IGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBvc2NpbGxhdGlvbjsgfSB9KTtcclxuICAgIHRoaXMuZ2V0U3RyZWFtU291cmNlID0gZnVuY3Rpb24oaGVydHope1xyXG4gICAgICAgIHJldHVybiBuZXcgVmFyaWFibGVTb3VyY2Uoe1xyXG4gICAgICAgICAgICBkYXRhOiB7IGZyZXF1ZW5jeTogaGVydHogfSxcclxuICAgICAgICAgICAgZXhwZWN0ZWREYXRhOiBbJ2ZyZXF1ZW5jeSddLFxyXG4gICAgICAgICAgICByZXF1ZXN0RGF0YTogZnVuY3Rpb24oc3RhcnRQb2ludCwgbGVuZ3RoLCBzYW1wbGVSYXRlLCBvcHRpb25zKXtcclxuICAgICAgICAgICAgICAgIHNhbXBsZVJhdGUgPSBzYW1wbGVSYXRlIHx8IDQ0MTAwO1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0VGltZSA9IHN0YXJ0UG9pbnQgLyBzYW1wbGVSYXRlO1xyXG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvcih2YXIgaT0wOyBpPGxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2gob3NjaWxsYXRpb24oc3RhcnRUaW1lICsgKGkgLyBzYW1wbGVSYXRlKSwgb3B0aW9ucy5mcmVxdWVuY3kpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuT3NjaWxsYXRvci5maWx0ZXJzID0ge1xyXG4gICAgbXVsdGlwbHk6IGZ1bmN0aW9uKG9yaWdpbmFsMSwgb3JpZ2luYWwyKXtcclxuICAgICAgICBpZih0eXBlb2Ygb3JpZ2luYWwyICE9PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSBvcmlnaW5hbDIgfHwge307XHJcbiAgICAgICAgICAgIGlmKHR5cGVvZiBvcHRpb25zLmZ1bmMgPT09IFwiZnVuY3Rpb25cIil7XHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbDIgPSBvcHRpb25zLmZ1bmM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSAwLjU7XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ251bWJlcicpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gb3B0aW9ucztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zLnZhbHVlIHx8IDAuNTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBwbGF0ZShmdW5jdGlvbih0aW1lLCBoZXJ0eil7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsMSh0aW1lLCBoZXJ0eikgKiB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwbGF0ZShmdW5jdGlvbih0aW1lLCBoZXJ0eil7XHJcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbDEodGltZSwgaGVydHopICogb3JpZ2luYWwyKHRpbWUsIGhlcnR6KTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBhZGQ6IGZ1bmN0aW9uKG9yaWdpbmFsMSwgb3JpZ2luYWwyKXtcclxuICAgICAgICBpZih0eXBlb2Ygb3JpZ2luYWwyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbDEodGltZSwgaGVydHopICsgb3JpZ2luYWwyKHRpbWUsIGhlcnR6KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsMSh0aW1lLCBoZXJ0eikgKyBvcmlnaW5hbDI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBkZXR1bmU6IGZ1bmN0aW9uKG9yaWdpbmFsLCBvcHRpb25zKXtcclxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgICAgICB2YXIgYW1vdW50ID0gMC41O1xyXG4gICAgICAgIGlmKHR5cGVvZiBvcHRpb25zID09PSBcIm51bWJlclwiKXtcclxuICAgICAgICAgICAgYW1vdW50ID0gb3B0aW9ucztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhbW91bnQgPSBvcHRpb25zLmFtb3VudCB8fCAwLjU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzeW5jaCA9IHR5cGVvZiBvcHRpb25zLnN5bmNoID09PSAnYm9vbGVhbicgPyBvcHRpb25zLnN5bmNoIDogdHJ1ZTtcclxuICAgICAgICByZXR1cm4gcGxhdGUoZnVuY3Rpb24odGltZSwgaGVydHope1xyXG4gICAgICAgICAgICB2YXIgbG9jYWxBbW91bnQgPSBhbW91bnQ7XHJcbiAgICAgICAgICAgIGlmKHN5bmNoKXtcclxuICAgICAgICAgICAgICAgIGxvY2FsQW1vdW50ICo9IGhlcnR6O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbCh0aW1lLCBoZXJ0eiArIGxvY2FsQW1vdW50KTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBwaGFzZTogZnVuY3Rpb24ob3JpZ2luYWwsIG9wdGlvbnMpe1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIHZhciBzaGlmdCA9IDAuNTtcclxuICAgICAgICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gXCJudW1iZXJcIil7XHJcbiAgICAgICAgICAgIHNoaWZ0ID0gb3B0aW9ucztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzaGlmdCA9IG9wdGlvbnMuc2hpZnQgfHwgMC41O1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3luY2ggPSB0eXBlb2Ygb3B0aW9ucy5zeW5jaCA9PT0gJ2Jvb2xlYW4nID8gb3B0aW9ucy5zeW5jaCA6IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIHBsYXRlKGZ1bmN0aW9uKHRpbWUsIGhlcnR6KXtcclxuICAgICAgICAgICAgdmFyIGxvY2FsU2hpZnQgPSBzaGlmdDtcclxuICAgICAgICAgICAgaWYoc3luY2gpe1xyXG4gICAgICAgICAgICAgICAgbG9jYWxTaGlmdCAqPSAxL2hlcnR6O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbCh0aW1lICsgbG9jYWxTaGlmdCwgaGVydHopO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIGJpdGNydXNoOiBmdW5jdGlvbihvcmlnaW5hbCwgb3B0aW9ucyl7XHJcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgdmFyIGJpdHMgPSBwYXJzZUludChvcHRpb25zLmJpdHMgfHwgOCk7XHJcbiAgICAgICAgcmV0dXJuIHBsYXRlKGZ1bmN0aW9uKHRpbWUsIGhlcnR6KXtcclxuICAgICAgICAgICAgdmFyIHZhbHVlID0gb3JpZ2luYWwodGltZSwgaGVydHopO1xyXG4gICAgICAgICAgICB2YXIgaW50VmFsdWUgPSBNYXRoLnJvdW5kKCh2YWx1ZSArIDEpIC8gMiAqIGJpdHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gKGludFZhbHVlIC8gYml0cyAqIDIpIC0gMTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBmbGF0UmVzYW1wbGU6IGZ1bmN0aW9uKG9yaWdpbmFsLCBvcHRpb25zKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgb3B0aW9ucy5yYXRlID0gcGFyc2VJbnQob3B0aW9ucy5yYXRlIHx8IDQ0MTApO1xyXG4gICAgICAgIHJldHVybiBwbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcclxuICAgICAgICAgICAgdmFyIGludFRpbWUgPSBwYXJzZUludCh0aW1lICogb3B0aW9ucy5yYXRlKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsKGludFRpbWUgLyBvcHRpb25zLnJhdGUsIGhlcnR6KTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBzbG9wZVJlc2FtcGxlOiBmdW5jdGlvbihvcmlnaW5hbCwgb3B0aW9ucykge1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIG9wdGlvbnMucmF0ZSA9IHBhcnNlSW50KG9wdGlvbnMucmF0ZSB8fCA0NDEwKTtcclxuICAgICAgICByZXR1cm4gcGxhdGUoZnVuY3Rpb24gKHRpbWUsIGhlcnR6KSB7XHJcbiAgICAgICAgICAgIHZhciBiZXR3ZWVuID0gdGltZSAqIG9wdGlvbnMucmF0ZTtcclxuICAgICAgICAgICAgdmFyIGludFRpbWUgPSBwYXJzZUludChiZXR3ZWVuKTtcclxuICAgICAgICAgICAgYmV0d2VlbiA9IGJldHdlZW4gJSAxO1xyXG4gICAgICAgICAgICB2YXIgZmlyc3QgPSBvcmlnaW5hbChpbnRUaW1lIC8gb3B0aW9ucy5yYXRlLCBoZXJ0eik7XHJcbiAgICAgICAgICAgIHZhciBzZWNvbmQgPSBvcmlnaW5hbCgoaW50VGltZSArIDEpIC8gb3B0aW9ucy5yYXRlLCBoZXJ0eik7XHJcbiAgICAgICAgICAgIHJldHVybiAoc2Vjb25kICogYmV0d2VlbikgKyAoZmlyc3QgKiAoMSAtIGJldHdlZW4pKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBjcmF6eVRvd246IGZ1bmN0aW9uKG9yaWdpbmFsLCBvcHRpb25zKSB7XHJcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICAgICAgdmFyIHZhcmlhbmNlID0gdHlwZW9mIG9wdGlvbnMudmFyaWFuY2UgPT09ICdudW1iZXInID8gb3B0aW9ucy52YXJpYW5jZSA6IDEwO1xyXG4gICAgICAgIHZhciByYXRlID0gdHlwZW9mIG9wdGlvbnMucmF0ZSA9PT0gJ251bWJlcicgPyBvcHRpb25zLnJhdGUgOiAxMDA7XHJcbiAgICAgICAgdmFyIHN5bmNoID0gdHlwZW9mIG9wdGlvbnMuc3luY2ggPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc3luY2ggOiB0cnVlO1xyXG4gICAgICAgIHZhciB2YWx1ZUZ1bmMgPSBvcHRpb25zLnZhbHVlRnVuYyB8fCBPc2NpbGxhdG9yLm9zY2lsbGF0aW9ucy5zaW5lO1xyXG4gICAgICAgIHJldHVybiBwbGF0ZShmdW5jdGlvbiAodGltZSwgaGVydHopIHtcclxuICAgICAgICAgICAgdmFyIHZhbHVlUmF0ZSA9IHJhdGU7XHJcbiAgICAgICAgICAgIGlmKHN5bmNoKXtcclxuICAgICAgICAgICAgICAgIHZhbHVlUmF0ZSA9IHJhdGUgKiBoZXJ0ejtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgbmV3SGVydHogPSBoZXJ0eiArIHZhbHVlRnVuYyh0aW1lLCB2YWx1ZVJhdGUpICogdmFyaWFuY2U7XHJcbiAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbCh0aW1lLCBuZXdIZXJ0eik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgY3Jvc3NQbGF0ZTogZnVuY3Rpb24ob3JpZ2luYWwxLCBvcmlnaW5hbDIsIG9wdGlvbnMpIHtcclxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgICAgICB2YXIgaGlnaEZyZXEgPSBvcHRpb25zLmhpZ2hGcmVxIHx8IDg7XHJcbiAgICAgICAgdmFyIHN5bmNoID0gdHlwZW9mIG9wdGlvbnMuc3luY2ggPT09ICdib29sZWFuJyA/IG9wdGlvbnMuc3luY2ggOiB0cnVlO1xyXG4gICAgICAgIHZhciBoaWdoRnVuYyA9IG9wdGlvbnMuaGlnaEZ1bmMgfHwgT3NjaWxsYXRvci5vc2NpbGxhdGlvbnMudHJpYW5nbGU7XHJcbiAgICAgICAgcmV0dXJuIHBsYXRlKGZ1bmN0aW9uICh0aW1lLCBoZXJ0eikge1xyXG4gICAgICAgICAgICB2YXIgc3VwZXJGcmVxID0gaGlnaEZyZXE7XHJcbiAgICAgICAgICAgIGlmKHN5bmNoKXtcclxuICAgICAgICAgICAgICAgIHN1cGVyRnJlcSAqPSBoZXJ0ejtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgc3VwZXJWYWwgPSAoaGlnaEZ1bmModGltZSwgc3VwZXJGcmVxKSArIDEpLzI7XHJcbiAgICAgICAgICAgIHZhciB2YWwxID0gb3JpZ2luYWwxKHRpbWUsIGhlcnR6KTtcclxuICAgICAgICAgICAgdmFyIHZhbDIgPSBvcmlnaW5hbDIodGltZSwgaGVydHopO1xyXG4gICAgICAgICAgICByZXR1cm4gc3VwZXJWYWwgKiAodmFsMSAtIHZhbDIpICsgdmFsMjtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuXHJcbnZhciBwbGF0ZSA9IGZ1bmN0aW9uKGZ1bmMpe1xyXG4gICAgZm9yKHZhciBuYW1lIGluIE9zY2lsbGF0b3IuZmlsdGVycyl7XHJcbiAgICAgICAgaWYoT3NjaWxsYXRvci5maWx0ZXJzLmhhc093blByb3BlcnR5KG5hbWUpKXtcclxuICAgICAgICAgICAgKGZ1bmN0aW9uKGxvY2FsTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgZnVuY1tsb2NhbE5hbWVdID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW2Z1bmNdO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT3NjaWxsYXRvci5maWx0ZXJzW2xvY2FsTmFtZV0uYXBwbHkod2luZG93LCBhcmdzKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0pKG5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBmdW5jO1xyXG59XHJcblxyXG5Pc2NpbGxhdG9yLm9zY2lsbGF0aW9ucyA9IHtcclxuICAgIHNpbmU6IHBsYXRlKGZ1bmN0aW9uKHRpbWUsIGhlcnR6KXtcclxuICAgICAgICByZXR1cm4gTWF0aC5zaW4odGltZSAqIGhlcnR6ICogMiAqIE1hdGguUEkpO1xyXG4gICAgfSksXHJcbiAgICBzcXVhcmU6IHBsYXRlKGZ1bmN0aW9uKHRpbWUsIGhlcnR6KXtcclxuICAgICAgICByZXR1cm4gKHRpbWUgKiBoZXJ0eikgJSAxIDwgMC41ID8gMSA6IC0xO1xyXG4gICAgfSksXHJcbiAgICB0cmlhbmdsZTogcGxhdGUoZnVuY3Rpb24odGltZSwgaGVydHope1xyXG4gICAgICAgIHZhciBzbG9wZSA9ICh0aW1lKiBoZXJ0eikgJSAxO1xyXG4gICAgICAgIHJldHVybiBzbG9wZSA8IDAuNSA/IHNsb3BlICogNCAtIDEgOiBzbG9wZSAqIC00ICsgMztcclxuICAgIH0pLFxyXG4gICAgcm91Z2hNYXRoOiBwbGF0ZShmdW5jdGlvbih0aW1lLCBoZXJ0eil7XHJcbiAgICAgICAgcmV0dXJuIE1hdGgucG93KChPc2NpbGxhdG9yLm9zY2lsbGF0aW9ucy5zaW5lKHRpbWUgLSAoMC4yNSAvIGhlcnR6KSwgaGVydHopICsgMSkgLyAyLCAxLzIpICogMiAtIDFcclxuICAgIH0pLFxyXG4gICAgcm91Z2hNYXRoMjogcGxhdGUoZnVuY3Rpb24odGltZSwgaGVydHope1xyXG4gICAgICAgIGhlcnR6ID0gaGVydHogLyAyO1xyXG4gICAgICAgIHJldHVybiAoT3NjaWxsYXRvci5vc2NpbGxhdGlvbnMuc2luZSh0aW1lLCBoZXJ0eikgKyBPc2NpbGxhdG9yLm9zY2lsbGF0aW9ucy5zYXd0b290aCh0aW1lLCBoZXJ0eikpICogT3NjaWxsYXRvci5vc2NpbGxhdGlvbnMudHJpYW5nbGUodGltZSArICgwLjI1IC8gaGVydHopLCBoZXJ0eikgKiAzIC0gMC41O1xyXG4gICAgfSksXHJcbiAgICByb3VnaE1hdGgzOiBwbGF0ZShmdW5jdGlvbih0aW1lLCBoZXJ0eil7XHJcbiAgICAgICAgdmFyIHNsb3BlID0gKHRpbWUgKiBoZXJ0eikgJSAxO1xyXG4gICAgICAgIHJldHVybiBNYXRoLnNpbmgoKHNsb3BlKjIgLSAxKSo1KSAqIDAuMDEzODtcclxuICAgIH0pLFxyXG4gICAgcm91Z2hNYXRoNDogcGxhdGUoZnVuY3Rpb24odGltZSwgaGVydHope1xyXG4gICAgICAgIHRpbWUgPSB0aW1lICogMjtcclxuICAgICAgICB2YXIgc2xvcGUgPSAodGltZSAqIGhlcnR6KTtcclxuICAgICAgICB2YXIgdmFsID0gTWF0aC5zaW5oKCgoc2xvcGUlMSkqMiAtIDEpKjUpICogMC4wMTM4O1xyXG4gICAgICAgIHJldHVybiBzbG9wZSUyIDwgMSA/IHZhbCA6IC0gdmFsO1xyXG4gICAgfSksXHJcbiAgICBzYXd0b290aDogcGxhdGUoZnVuY3Rpb24odGltZSwgaGVydHope1xyXG4gICAgICAgIHJldHVybiAoKHRpbWUgKiBoZXJ0eikgJSAxKSAqIDIgLSAxO1xyXG4gICAgfSksXHJcbiAgICBmcm9tVmFsdWU6IGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICByZXR1cm4gcGxhdGUoZnVuY3Rpb24odGltZSwgaGVydHope1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgbm9pc2U6IHBsYXRlKGZ1bmN0aW9uKHRpbWUsIGhlcnRzKXtcclxuICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKSAqIDIgLSAxO1xyXG4gICAgfSksXHJcbiAgICBmaWx0ZXJzOiBPc2NpbGxhdG9yLmZpbHRlcnNcclxufTtcclxuXHJcbk9iamVjdC5mcmVlemUoT3NjaWxsYXRvcik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE9zY2lsbGF0b3I7IiwidmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcclxudmFyIFNvdXJjZSA9IHJlcXVpcmUoJy4vU291cmNlJyk7XHJcblxyXG5mdW5jdGlvbiBTYW1wbGVTb3VyY2Uob3B0aW9ucyl7XHJcbiAgICBpZih0aGlzIGluc3RhbmNlb2YgU2FtcGxlU291cmNlKXtcclxuICAgICAgICBTYW1wbGVTb3VyY2UuaW5pdC5jYWxsKHRoaXMsIG9wdGlvbnMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gbmV3IFNhbXBsZVNvdXJjZShvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG5cclxuU2FtcGxlU291cmNlLmluaXQgPSBmdW5jdGlvbihvcHRpb25zKXtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgdmFyIHNhbXBsZSA9IG9wdGlvbnMuc2FtcGxlO1xyXG4gICAgdmFyIHJlcGVhdCA9IG9wdGlvbnMucmVwZWF0IHx8IGZhbHNlO1xyXG4gICAgdmFyIHJlcXVlc3REYXRhO1xyXG4gICAgaWYocmVwZWF0KXtcclxuICAgICAgICByZXF1ZXN0RGF0YSA9IGZ1bmN0aW9uKHN0YXJ0UG9pbnQsIGxlbmd0aCl7XHJcbiAgICAgICAgICAgIHZhciBzdWJTYW1wbGUgPSBbXTtcclxuICAgICAgICAgICAgZm9yKHZhciBpPTA7IGk8bGVuZ3RoOyBpKyspe1xyXG4gICAgICAgICAgICAgICAgc3ViU2FtcGxlLnB1c2goc2FtcGxlWyhpK3N0YXJ0UG9pbnQpJXNhbXBsZS5sZW5ndGhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gc3ViU2FtcGxlO1xyXG4gICAgICAgIH07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlcXVlc3REYXRhID0gZnVuY3Rpb24oc3RhcnRQb2ludCwgbGVuZ3RoKXtcclxuICAgICAgICAgICAgdmFyIHN1YlNhbXBsZSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTxsZW5ndGg7IGkrKyl7XHJcbiAgICAgICAgICAgICAgICBzdWJTYW1wbGUucHVzaChzYW1wbGVbaStzdGFydFBvaW50XSB8fCAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gc3ViU2FtcGxlO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBoZWxwZXJzLmV4dGVuZCh0aGlzLCBuZXcgU291cmNlKHtcclxuICAgICAgICByZXF1ZXN0RGF0YTogcmVxdWVzdERhdGFcclxuICAgIH0pKTtcclxufTtcclxuXHJcbmhlbHBlcnMuZXh0ZW5kKFNhbXBsZVNvdXJjZS5wcm90b3R5cGUsIFNvdXJjZS5wcm90b3R5cGUpO1xyXG5cclxuT2JqZWN0LmZyZWV6ZShTYW1wbGVTb3VyY2UpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTYW1wbGVTb3VyY2U7IiwibW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cudG1wQ29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTsiLCJcclxuZnVuY3Rpb24gU291cmNlKG9wdGlvbnMpe1xyXG4gICAgaWYodGhpcyBpbnN0YW5jZW9mIFNvdXJjZSl7XHJcbiAgICAgICAgU291cmNlLmluaXQuY2FsbCh0aGlzLCBvcHRpb25zKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTb3VyY2Uob3B0aW9ucyk7XHJcbiAgICB9XHJcbn1cclxuXHJcblNvdXJjZS5pbml0ID0gZnVuY3Rpb24ob3B0aW9ucyl7XHJcbiAgICBpZighb3B0aW9ucyB8fCB0eXBlb2Ygb3B0aW9ucy5yZXF1ZXN0RGF0YSAhPT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBIFNvdW5kU291cmNlIHJlcXVpcmVzIGEgZnVuY3Rpb24gbmFtZWQgcmVxdWVzdERhdGEnKTtcclxuICAgIH1cclxuICAgIHRoaXMucmVxdWVzdERhdGEgPSBvcHRpb25zLnJlcXVlc3REYXRhO1xyXG59O1xyXG5cclxuT2JqZWN0LmZyZWV6ZShTb3VyY2UpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTb3VyY2U7IiwidmFyIFNvdXJjZSA9IHJlcXVpcmUoJy4vU291cmNlJyk7XHJcbnZhciBWYXJpYWJsZVNvdXJjZSA9IHJlcXVpcmUoJy4vVmFyaWFibGVTb3VyY2UnKTtcclxudmFyIGNvbnRleHQgPSByZXF1aXJlKCcuL1NpbmdsZXRvbkF1ZGlvQ29udGV4dCcpO1xyXG5cclxuZnVuY3Rpb24gU291cmNlU291bmQob3B0aW9ucyl7XHJcbiAgICBpZih0aGlzIGluc3RhbmNlb2YgU291cmNlU291bmQpe1xyXG4gICAgICAgIFNvdXJjZVNvdW5kLmluaXQuY2FsbCh0aGlzLCBvcHRpb25zKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBTb3VyY2VTb3VuZChvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG5cclxuU291cmNlU291bmQuaW5pdCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xyXG4gICAgaWYoIW9wdGlvbnMpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNvdXJjZVNvdW5kIHJlcXVpcmVzIGFuIG9wdGlvbnMgaGFzaCB0byBiZSBwYXNzZWQgaW4sIHdpdGggYSBTb3VyY2VTb3VuZCBuYW1lZCBzb3VyY2VcIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYoIShvcHRpb25zLnNvdXJjZSBpbnN0YW5jZW9mIFZhcmlhYmxlU291cmNlKSl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU291cmNlU291bmQgcmVxdWlyZXMgYSBTb3VuZFNvdXJjZSBuYW1lZCBzb3VyY2VcIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYoKHR5cGVvZiBvcHRpb25zLmRlbGF5ICE9PSBcIm51bWJlclwiICYmIHR5cGVvZiBvcHRpb25zLmRlbGF5ICE9PSBcInVuZGVmaW5lZFwiKSB8fCAodHlwZW9mIG9wdGlvbnMuZGVsYXkgPT09IFwibnVtYmVyXCIgJiYgb3B0aW9ucy5kZWxheSA8PSAwKSl7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSWYgYSBkZWxheSBpcyBzdXBwbGllZCwgaXQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlclwiKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc291cmNlID0gb3B0aW9ucy5zb3VyY2U7XHJcbiAgICB2YXIgZGVsYXkgPSBvcHRpb25zLmRlbGF5IHx8IDAuMTtcclxuICAgIHZhciBidWZmZXJDb3VudCA9IG9wdGlvbnMuYnVmZmVyQ291bnQgfHwgMztcclxuXHJcbiAgICB2YXIgYnVmZmVyU2l6ZSA9IHBhcnNlSW50KGRlbGF5ICogNDQxMDApO1xyXG4gICAgdmFyIGZ1bGxCdWZmZXJTaXplID0gYnVmZmVyU2l6ZSAqIGJ1ZmZlckNvdW50O1xyXG5cclxuICAgIHZhciBidWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCBmdWxsQnVmZmVyU2l6ZSwgNDQxMDApO1xyXG5cclxuICAgIHZhciBnYWluTm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xyXG4gICAgZ2Fpbk5vZGUuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcclxuXHJcbiAgICB2YXIgY3VycmVudEZyYW1lID0gMDtcclxuICAgIHZhciBidWZmZXJTb3VyY2UgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgdmFyIHRpbWVvdXRJZCA9IDA7XHJcbiAgICB2YXIgbGFzdFRpbWUgPSAwO1xyXG4gICAgdmFyIHN0YXJ0VGltZSA9IDA7XHJcblxyXG4gICAgdmFyIGlzUGxheWluZyA9IGZhbHNlO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdpc1BsYXlpbmcnLCB7IGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBpc1BsYXlpbmc7IH0gfSk7XHJcblxyXG4gICAgdmFyIGZpbGxCdWZmZXIgPSBmdW5jdGlvbihzdGFydGluZ0ZyYW1lLCBsZW5ndGgsIG9wdGlvbnMpe1xyXG4gICAgICAgIHZhciBjaGFubmVsRGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcclxuICAgICAgICB2YXIgbmV3RGF0YSA9IHNvdXJjZS5yZXF1ZXN0RGF0YShzdGFydGluZ0ZyYW1lLCBsZW5ndGgsIDQ0MTAwLCBvcHRpb25zKTtcclxuICAgICAgICBmb3IodmFyIGk9MDsgaTxuZXdEYXRhLmxlbmd0aDsgaSsrKXtcclxuICAgICAgICAgICAgY2hhbm5lbERhdGFbKGkgKyBzdGFydGluZ0ZyYW1lKSAlIGNoYW5uZWxEYXRhLmxlbmd0aF0gPSBuZXdEYXRhW2ldO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGNyZWF0ZUJ1ZmZlclNvdXJjZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XHJcbiAgICAgICAgb3V0cHV0LmJ1ZmZlciA9IGJ1ZmZlcjtcclxuICAgICAgICBvdXRwdXQubG9vcCA9IHRydWU7XHJcbiAgICAgICAgb3V0cHV0LmNvbm5lY3QoZ2Fpbk5vZGUpO1xyXG4gICAgICAgIHJldHVybiBvdXRwdXQ7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBmcmFtZXNFbGFwc2VkID0gZnVuY3Rpb24oc3RhcnQsIGVuZCl7XHJcbiAgICAgICAgdmFyIHN0YXJ0RnJhbWUgPSBNYXRoLnJvdW5kKHN0YXJ0ICogNDQxMDApO1xyXG4gICAgICAgIHZhciBlbmRGcmFtZSA9IE1hdGgucm91bmQoZW5kICogNDQxMDApO1xyXG4gICAgICAgIHJldHVybiBlbmRGcmFtZSAtIHN0YXJ0RnJhbWU7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMucGxheSA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIGN1cnJlbnRGcmFtZSA9IGZ1bGxCdWZmZXJTaXplIC0gKGJ1ZmZlclNpemUgLyAyKTtcclxuICAgICAgICBmaWxsQnVmZmVyKDAsIGZ1bGxCdWZmZXJTaXplLCBvcHRpb25zKTtcclxuICAgICAgICB2YXIgZXhwZWN0ZWRNcyA9IGRlbGF5ICogMTAwMDtcclxuICAgICAgICB2YXIgbWF4RXJyID0gZXhwZWN0ZWRNcyAqIDAuMjtcclxuICAgICAgICB2YXIgbWluRXJyID0gZXhwZWN0ZWRNcyAqIC0wLjI7XHJcbiAgICAgICAgdmFyIHRpbWVvdXRGdW5jID0gZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgdmFyIGN1cnJlbnRUaW1lID0gY29udGV4dC5jdXJyZW50VGltZTtcclxuICAgICAgICAgICAgdmFyIGRpZmZGcmFtZXMgPSBmcmFtZXNFbGFwc2VkKGxhc3RUaW1lLCBjdXJyZW50VGltZSk7XHJcbiAgICAgICAgICAgIHZhciBkaWZmVGltZSA9IGN1cnJlbnRUaW1lIC0gbGFzdFRpbWU7XHJcbiAgICAgICAgICAgIGxhc3RUaW1lID0gY3VycmVudFRpbWU7XHJcbiAgICAgICAgICAgIGlmKGRpZmZGcmFtZXMgPCBmdWxsQnVmZmVyU2l6ZSkge1xyXG4gICAgICAgICAgICAgICAgZmlsbEJ1ZmZlcihjdXJyZW50RnJhbWUsIGRpZmZGcmFtZXMsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudEZyYW1lICs9IGRpZmZGcmFtZXMgLSBmdWxsQnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGZpbGxCdWZmZXIoY3VycmVudEZyYW1lLCBmdWxsQnVmZmVyU2l6ZSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3VycmVudEZyYW1lICs9IGRpZmZGcmFtZXM7XHJcbiAgICAgICAgICAgIHZhciBhY3R1YWxNcyA9IGRpZmZUaW1lICogMTAwMDtcclxuICAgICAgICAgICAgdmFyIGVyck1zID0gTWF0aC5tYXgobWluRXJyLCBNYXRoLm1pbihhY3R1YWxNcyAtIGV4cGVjdGVkTXMsIG1heEVycikpO1xyXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KHRpbWVvdXRGdW5jLCBleHBlY3RlZE1zIC0gZXJyTXMgKiAwLjkgKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGltZW91dElkID0gd2luZG93LnNldFRpbWVvdXQodGltZW91dEZ1bmMsIGRlbGF5ICogMTAwMCAtIDEwKTtcclxuICAgICAgICBidWZmZXJTb3VyY2UgPSBjcmVhdGVCdWZmZXJTb3VyY2UoKTtcclxuICAgICAgICBpc1BsYXlpbmcgPSB0cnVlO1xyXG4gICAgICAgIGxhc3RUaW1lID0gc3RhcnRUaW1lID0gY29udGV4dC5jdXJyZW50VGltZTtcclxuICAgICAgICBidWZmZXJTb3VyY2Uuc3RhcnQoKTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5zdG9wID0gZnVuY3Rpb24oKXtcclxuICAgICAgICBpc1BsYXlpbmcgPSBmYWxzZTtcclxuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgdGltZW91dElkID0gMDtcclxuICAgICAgICBidWZmZXJTb3VyY2Uuc3RvcCgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuT2JqZWN0LmZyZWV6ZShTb3VyY2VTb3VuZCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNvdXJjZVNvdW5kOyIsInZhciBoZWxwZXJzID0gcmVxdWlyZSgnLi9oZWxwZXJzJyk7XHJcbnZhciBTb3VyY2UgPSByZXF1aXJlKCcuL1NvdXJjZScpO1xyXG5cclxuZnVuY3Rpb24gVmFyaWFibGVTb3VyY2Uob3B0aW9ucyl7XHJcbiAgICBpZih0aGlzIGluc3RhbmNlb2YgVmFyaWFibGVTb3VyY2Upe1xyXG4gICAgICAgIFZhcmlhYmxlU291cmNlLmluaXQuY2FsbCh0aGlzLCBvcHRpb25zKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWYXJpYWJsZVNvdXJjZShvcHRpb25zKTtcclxuICAgIH1cclxufVxyXG5cclxuVmFyaWFibGVTb3VyY2UuaW5pdCA9IGZ1bmN0aW9uKG9wdGlvbnMpe1xyXG4gICAgaWYoIW9wdGlvbnMgfHwgdHlwZW9mIG9wdGlvbnMucmVxdWVzdERhdGEgIT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQSBWYXJpYWJsZVNvdXJjZSByZXF1aXJlcyBhIGZ1bmN0aW9uIG5hbWVkIHJlcXVlc3REYXRhJyk7XHJcbiAgICB9XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgZXhwZWN0ZWREYXRhID0gb3B0aW9ucy5leHBlY3RlZERhdGEgfHwgW107XHJcbiAgICB2YXIgdmFyaWFibGVSZXF1ZXN0RGF0YSA9IG9wdGlvbnMucmVxdWVzdERhdGE7XHJcblxyXG4gICAgdGhpcy5kYXRhID0gb3B0aW9ucy5kYXRhIHx8IHt9O1xyXG5cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnZXhwZWN0ZWREYXRhJywgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZXhwZWN0ZWREYXRhOyB9IH0pO1xyXG5cclxuICAgIGhlbHBlcnMuZXh0ZW5kKHRoaXMsIG5ldyBTb3VyY2Uoe1xyXG4gICAgICAgIHJlcXVlc3REYXRhOiBmdW5jdGlvbihzdGFydFBvaW50LCBsZW5ndGgsIHNhbXBsZVJhdGUsIHRtcERhdGEpe1xyXG4gICAgICAgICAgICByZXR1cm4gdmFyaWFibGVSZXF1ZXN0RGF0YShzdGFydFBvaW50LCBsZW5ndGgsIHNhbXBsZVJhdGUsIHRtcERhdGEgfHwgc2VsZi5kYXRhKTtcclxuICAgICAgICB9XHJcbiAgICB9KSlcclxufTtcclxuXHJcbmhlbHBlcnMuZXh0ZW5kKFZhcmlhYmxlU291cmNlLnByb3RvdHlwZSwgU291cmNlLnByb3RvdHlwZSk7XHJcblxyXG5PYmplY3QuZnJlZXplKFZhcmlhYmxlU291cmNlKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmFyaWFibGVTb3VyY2U7IiwiLypqc2xpbnQgbm9kZTogdHJ1ZSovXHJcbm1vZHVsZS5leHBvcnRzID0gd2luZG93LnNvdW5kV29ya3MgPSB7XHJcbiAgICBCdWZmZXJlZFNvdW5kOiByZXF1aXJlKCcuL0J1ZmZlcmVkU291bmQnKSxcclxuICAgIFNvdXJjZVNvdW5kOiByZXF1aXJlKCcuL1NvdXJjZVNvdW5kMicpLFxyXG4gICAgT3NjaWxsYXRvcjogcmVxdWlyZSgnLi9Pc2NpbGxhdG9yJyksXHJcbiAgICBNaWRpU3RhdGU6IHJlcXVpcmUoJy4vTWlkaVN0YXRlJyksXHJcbiAgICBNaWRpQWRhcHRlcjogcmVxdWlyZSgnLi9NaWRpQWRhcHRlcicpLFxyXG4gICAgU291cmNlOiB7XHJcbiAgICAgICAgQmFzZTogcmVxdWlyZSgnLi9Tb3VyY2UnKSxcclxuICAgICAgICBWYXJpYWJsZTogcmVxdWlyZSgnLi9WYXJpYWJsZVNvdXJjZScpLFxyXG4gICAgICAgIFNhbXBsZTogcmVxdWlyZSgnLi9TYW1wbGVTb3VyY2UnKSxcclxuICAgICAgICBNaWRpOiByZXF1aXJlKCcuL01pZGlTb3VyY2UnKVxyXG4gICAgfVxyXG59OyIsInZhciB1c2luZ1NldFByb3RvdHlwZU9mID0gZnVuY3Rpb24oc2VsZiwgc3VwZXJPYmplY3Qpe1xyXG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHNlbGYsIHN1cGVyT2JqZWN0KTtcclxufVxyXG5cclxudmFyIHVzaW5nUHJvdG8gPSBmdW5jdGlvbihzZWxmLCBzdXBlck9iamVjdCl7XHJcbiAgICBzZWxmLl9fcHJvdG9fXyA9IHN1cGVyT2JqZWN0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIGV4dGVuZDogZnVuY3Rpb24oc2VsZiwgc3VwZXJPYmplY3Qpe1xyXG4gICAgICAgIHZhciBvcmlnaW5hbFByb3RvdHlwZSA9IHNlbGYuX19wcm90b19fO1xyXG4gICAgICAgIHZhciBzdXBlckNvbnN0cnVjdG9yUHJvdG90eXBlID0gc3VwZXJPYmplY3QuY29uc3RydWN0b3IucHJvdG90eXBlO1xyXG4gICAgICAgIHZhciBzZXRQcm90b3R5cGU7XHJcbiAgICAgICAgaWYodHlwZW9mIE9iamVjdC5zZXRQcm90b3R5cGVPZiA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgIHNldFByb3RvdHlwZSA9IHVzaW5nU2V0UHJvdG90eXBlT2Y7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0UHJvdG90eXBlID0gdXNpbmdQcm90bztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFByb3RvdHlwZShzZWxmLCBzdXBlck9iamVjdCk7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRQcm90b3R5cGUgPSBzZWxmO1xyXG4gICAgICAgIHdoaWxlKGN1cnJlbnRQcm90b3R5cGUuX19wcm90b19fICE9PSBzdXBlckNvbnN0cnVjdG9yUHJvdG90eXBlKXtcclxuICAgICAgICAgICAgY3VycmVudFByb3RvdHlwZSA9IGN1cnJlbnRQcm90b3R5cGUuX19wcm90b19fO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXRQcm90b3R5cGUoY3VycmVudFByb3RvdHlwZSwgb3JpZ2luYWxQcm90b3R5cGUpO1xyXG4gICAgICAgIHJldHVybiBzZWxmO1xyXG4gICAgfVxyXG59IiwidmFyIG5vdGVzID0ge1xyXG4gICAgQV9GTEFUOiAnRyMnLFxyXG4gICAgQTogJ0EnLFxyXG4gICAgQV9TSEFSUDogJ0EjJyxcclxuICAgIEJfRkxBVDogJ0EjJyxcclxuICAgIEI6ICdCJyxcclxuICAgIEJfU0hBUlA6ICdDJyxcclxuICAgIENfRkxBVDogJ0InLFxyXG4gICAgQzogJ0MnLFxyXG4gICAgQ19TSEFSUDogJ0MjJyxcclxuICAgIERfRkxBVDogJ0MjJyxcclxuICAgIEQ6ICdEJyxcclxuICAgIERfU0hBUlA6ICdEIycsXHJcbiAgICBFX0ZMQVQ6ICdEIycsXHJcbiAgICBFOiAnRScsXHJcbiAgICBFX1NIQVJQOiAnRicsXHJcbiAgICBGX0ZMQVQ6ICdFJyxcclxuICAgIEY6ICdGJyxcclxuICAgIEZfU0hBUlA6ICdGIycsXHJcbiAgICBHX0ZMQVQ6ICdGIycsXHJcbiAgICBHOiAnRycsXHJcbiAgICBHX1NIQVJQOiAnRyMnXHJcbn07XHJcblxyXG52YXIgbWlkaU9yZGVyID0gW1xyXG4gICAgbm90ZXMuQyxcclxuICAgIG5vdGVzLkNfU0hBUlAsXHJcbiAgICBub3Rlcy5ELFxyXG4gICAgbm90ZXMuRF9TSEFSUCxcclxuICAgIG5vdGVzLkUsXHJcbiAgICBub3Rlcy5GLFxyXG4gICAgbm90ZXMuRl9TSEFSUCxcclxuICAgIG5vdGVzLkcsXHJcbiAgICBub3Rlcy5HX1NIQVJQLFxyXG4gICAgbm90ZXMuQSxcclxuICAgIG5vdGVzLkFfU0hBUlAsXHJcbiAgICBub3Rlcy5CXHJcbl07XHJcblxyXG5PYmplY3QuZnJlZXplKG5vdGVzKTtcclxuXHJcbnZhciByZXZlcnNlTWlkaU9yZGVyID0ge1xyXG4gICAgJ0MnOiAwLFxyXG4gICAgJ0MjJzogMSxcclxuICAgICdEJzogMixcclxuICAgICdEIyc6IDMsXHJcbiAgICAnRSc6IDQsXHJcbiAgICAnRic6IDUsXHJcbiAgICAnRiMnOiA2LFxyXG4gICAgJ0cnOiA3LFxyXG4gICAgJ0cjJzogOCxcclxuICAgICdBJzogOSxcclxuICAgICdBIyc6IDEwLFxyXG4gICAgJ0InOiAxMVxyXG59O1xyXG5cclxudmFyIG1pZGlOdW1iZXJUb05vdGUgPSBmdW5jdGlvbihudW1iZXIpe1xyXG4gICAgdmFyIG9jdGF2ZSA9IHBhcnNlSW50KG51bWJlciAvIDEyKTtcclxuICAgIHJldHVybiBtaWRpT3JkZXJbbnVtYmVyICUgMTJdICsgJyAnICsgb2N0YXZlO1xyXG59O1xyXG5cclxudmFyIG5vdGVUb01pZGlOdW1iZXIgPSBmdW5jdGlvbihub3RlKXtcclxuICAgIHZhciBzcGxpdCA9IG5vdGUuc3BsaXQoJyAnKTtcclxuICAgIHJldHVybiByZXZlcnNlTWlkaU9yZGVyW3NwbGl0WzBdXSArIHBhcnNlSW50KHNwbGl0WzFdKSAqIDEyO1xyXG59O1xyXG5cclxudmFyIHN0YW5kYXJkaXplID0gZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgaWYoaXNOYU4odmFsdWUpKXtcclxuICAgICAgICByZXR1cm4gbm90ZVRvTWlkaU51bWJlcih2YWx1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBwYXJzZUludCh2YWx1ZSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG52YXIgZ2V0RnJlcXVlbmN5ID0gZnVuY3Rpb24obm90ZVZhbHVlKXtcclxuICAgIG5vdGVWYWx1ZSA9IHN0YW5kYXJkaXplKG5vdGVWYWx1ZSk7XHJcbiAgICByZXR1cm4gNDQwICogTWF0aC5wb3coMiwgKG5vdGVWYWx1ZSAtIDU3KSAvIDEyKTtcclxufVxyXG5cclxudmFyIG1pZGlIZWxwZXJzID0ge1xyXG4gICAgbm90ZXM6IG5vdGVzLFxyXG4gICAgbWlkaU51bWJlclRvTm90ZTogbWlkaU51bWJlclRvTm90ZSxcclxuICAgIG5vdGVUb01pZGlOdW1iZXI6IG5vdGVUb01pZGlOdW1iZXIsXHJcbiAgICBzdGFuZGFyZGl6ZTogc3RhbmRhcmRpemUsXHJcbiAgICBnZXRGcmVxdWVuY3k6IGdldEZyZXF1ZW5jeVxyXG59O1xyXG5cclxuT2JqZWN0LmZyZWV6ZShtaWRpSGVscGVycyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG1pZGlIZWxwZXJzOyJdfQ==
