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