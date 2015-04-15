/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../typings/basic.d.ts" />

export var filters: any = {
    multiply(original1: (time: number, hertz: number) => number, original2: any){
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
    add(original1: (time: number, hertz: number) => number[], original2: any){
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
    detune(original: (time: number, hertz: number) => number, options: any){
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
    phase(original: (time: number, hertz: number) => number, options: any){
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
    bitcrush(original: (time: number, hertz: number) => number, options: any){
        options = options || {};
        var bits = Math.floor(options.bits || 8);
        return plate(function(time, hertz){
            var value = original(time, hertz);
            var intValue = Math.round((value + 1) / 2 * bits);
            return (intValue / bits * 2) - 1;
        });
    },
    flatResample(original: (time: number, hertz: number) => number, options: any) {
        options = options || {};
        options.rate = Math.floor(options.rate || 4410);
        return plate(function (time, hertz) {
            var intTime = Math.floor(time * options.rate);
            return original(intTime / options.rate, hertz);
        });
    },
    slopeResample(original: (time: number, hertz: number) => number, options: any) {
        options = options || {};
        options.rate = Math.floor(options.rate || 4410);
        return plate(function (time, hertz) {
            var between = time * options.rate;
            var intTime = Math.floor(between);
            between = between % 1;
            var first = original(intTime / options.rate, hertz);
            var second = original((intTime + 1) / options.rate, hertz);
            return (second * between) + (first * (1 - between));
        });
    },
    crazyTown(original: (time: number, hertz: number) => number, options: any) {
        options = options || {};
        var variance = typeof options.variance === 'number' ? options.variance : 10;
        var rate = typeof options.rate === 'number' ? options.rate : 100;
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        var valueFunc = options.valueFunc || oscillations.sine;
        return plate(function (time, hertz) {
            var valueRate = rate;
            if(synch){
                valueRate = rate * hertz;
            }
            var newHertz = hertz + valueFunc(time, valueRate) * variance;
            return original(time, newHertz);
        });
    },
    crossPlate(original1: (time: number, hertz: number) => number, original2: (time: number, hertz: number) => number, options: any) {
        options = options || {};
        var highFreq = options.highFreq || 8;
        var synch = typeof options.synch === 'boolean' ? options.synch : true;
        var highFunc = options.highFunc || oscillations.triangle;
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

export var plate = function(func: (time: number, hertz: number) => number){
    for(var name in filters){
        if(filters.hasOwnProperty(name)){
            (function(localName: string) {
                func[localName] = function () {
                    var args = [func];
                    for (var i = 0; i < arguments.length; i++) {
                        args.push(arguments[i]);
                    }
                    return filters[localName].apply(window, args);
                };
            })(name);
        }
    }
    return func;
};

export var oscillations: any = {
    sine: plate(function(time: number, hertz: number){
        return Math.sin(time * hertz * 2 * Math.PI);
    }),
    square: plate(function(time: number, hertz: number){
        return (time * hertz) % 1 < 0.5 ? 1 : -1;
    }),
    triangle: plate(function(time: number, hertz: number){
        var slope = (time* hertz) % 1;
        return slope < 0.5 ? slope * 4 - 1 : slope * -4 + 3;
    }),
    roughMath: plate(function(time: number, hertz: number){
        return Math.pow((oscillations.sine(time - (0.25 / hertz), hertz) + 1) / 2, 1/2) * 2 - 1
    }),
    roughMath2: plate(function(time: number, hertz: number){
        hertz = hertz / 2;
        return (oscillations.sine(time, hertz) + oscillations.sawtooth(time, hertz)) * oscillations.triangle(time + (0.25 / hertz), hertz) * 3 - 0.5;
    }),
    roughMath3: plate(function(time: number, hertz: number){
        var slope = (time * hertz) % 1;
        return Math.sinh((slope*2 - 1)*5) * 0.0138;
    }),
    roughMath4: plate(function(time: number, hertz: number){
        time = time * 2;
        var slope = (time * hertz);
        var val = Math.sinh(((slope%1)*2 - 1)*5) * 0.0138;
        return slope%2 < 1 ? val : - val;
    }),
    sawtooth: plate(function(time: number, hertz: number){
        return ((time * hertz) % 1) * 2 - 1;
    }),
    fromValue: function(value: number){
        return plate(function(time: number, hertz: number){
            return value;
        });
    },
    noise: plate(function(time: number, hertz: number){
        return Math.random() * 2 - 1;
    })
};