/**
 * Created by kevin on 10/9/15.
 */
'use strict';

class WindowFunction {
    constructor(options: { hop: number; width: number; func: (position: number, width: number) => number; mutable?: boolean }){
        this.hop = options.hop;
        this.width = options.width;
        this.func = options.func;

        var values: number[] = [];
        for(var i=0; i<options.width; i++){
            values.push(options.func(i, options.width));
        }
        this.values = values;
        if(!(options.mutable)) {
            Object.freeze(values);
            Object.freeze(this);
        }
    }
    hop: number;
    width: number;
    func: (position: number, width: number) => number;
    values: number[];
}

module WindowFunction {
    export function makeCOLATestArray(window: WindowFunction, trim?: boolean) : number[] {
        trim = trim || false;

        var values: number[] = [];

        var hopCount = window.width / window.hop + 3;
        for(var i=0; i<hopCount; i++){
            let shift = i * window.hop;
            for(var j=0; j<window.width; j++){
                let pos = shift + j;
                values[pos] = (values[pos] || 0) + window.values[j];
            }
        }
        if(trim) {
            var nonOverlap = window.width;
            values.splice(0, nonOverlap);
            values.splice(values.length - nonOverlap, nonOverlap);
        }

        return values;
    }
    export function testCOLA(window: WindowFunction, tolerance: number) : boolean {
        tolerance = typeof tolerance === 'number' ? tolerance : 0.000001;
        var testArray = makeCOLATestArray(window, true);
        var works = true;

        for(var i=0; i<testArray.length; i++){
            if(Math.abs(1 - testArray[i]) > tolerance){
                console.log('error at index', i, '; value', testArray[i], 'is not within tolerance', tolerance);
                works = false;
            }
        }

        return works;
    }

    export class MakerModule {
        constructor(){
            this.hanning = hanningWindowBuilder;
            this.blackman = blackmanWindowBuilder;
            this.square = squareWindowBuilder;
        }
        [name: string]: (length: number, options: any) => WindowFunction;
        hanning: (length: number, options: any) => WindowFunction;
        blackman: (length: number, options: any) => WindowFunction;
        square: (length: number, options: any) => WindowFunction;
    }

    export class RawModule {
        constructor(){
            this.hanning = hanningWindowFunction;
            this.blackman = blackmanWindowFunction;
            this.square = squareWindowFunction;
        }
        [name: string]: (position: number, width: number) => number;
        hanning: (position: number, width: number) => number;
        blackman: (position: number, width: number) => number;
        square: (position: number, width: number) => number;
    }
    export var make = new MakerModule();
    export var raw = new RawModule();
}



function hanningWindowBuilder(width: number, options: { zeroPhase?: boolean }) : WindowFunction {
    options = options || {};
    var zeroPhase = options.zeroPhase === undefined ? true : options.zeroPhase;

    if(width % 2 && zeroPhase){
        console.warn('WARNING: The zero-phase hanning window implementation with odd width does not have constant overlap add!');
    }
    var hop = (width + (width % 2)) / 2;
    var hanningChoice = width % 2 === 0 ? hanningWindowFunctionEven : hanningWindowFunctionOdd;
    var phaseGap = zeroPhase ? 0 : hop;
    function hann(position: number){
        return hanningChoice(position + phaseGap, width);
    }
    return new WindowFunction({
        hop: hop,
        width: width,
        func: hann
    });
}

function blackmanWindowBuilder(width: number, options: { zeroPhase?: boolean }) : WindowFunction {
    options = options || {};
    var zeroPhase = options.zeroPhase === undefined ? true : options.zeroPhase;

    console.warn('WARNING: Current blackman window implementation does not have constant overlap add!');

    var hop = width % 2 === 0 ? width / 3 : (width - 1) / 3;
    var phaseGap = zeroPhase ? (width / 2)<<0 : 0;
    function blackman(position: number){
        return blackmanWindowFunction(position + phaseGap, width);
    }
    return new WindowFunction({
        hop: hop,
        width: width,
        func: blackman
    });
}

function squareWindowBuilder(width: number, options: { overlap?: number }) : WindowFunction {
    options = options || {};
    var overlap = options.overlap || 1;
    var hop = Math.abs(width / overlap)<<0;
    if(width % overlap){
        console.warn('WARNING: Square windows where width is not evenly divisible by the overlap do not have constant overlap add!');
    }
    var output = 1 / overlap;
    function square(){
        return output;
    }
    return new WindowFunction({
        hop: hop,
        width: width,
        func: square
    })
}

function hanningWindowFunction(position: number, width: number) : number {
    return width % 2 === 0 ? hanningWindowFunctionEven(position, width) : hanningWindowFunctionOdd(position, width);
}

function hanningWindowFunctionEven(position: number, width: number) : number {
    return .5 * (1 + Math.cos(2 * Math.PI * position / width));
}

function hanningWindowFunctionOdd(position: number, width: number) : number {
    return .5 * (1 + Math.cos(2 * Math.PI * (position + 1) / (width + 1)));
}

function blackmanWindowFunction(position: number, width: number) : number {
    var m = width;
    return .42 - .5 * Math.cos(2 * Math.PI * position / m) + .08 * Math.cos(4 * Math.PI * position / m)
}

function squareWindowFunction(position: number, width: number) : number {
    return 1;
}




export default WindowFunction;