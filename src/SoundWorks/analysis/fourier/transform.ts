/**
 * Created by kevin on 10/9/15.
 */

import * as cah from '../complexArrayHelpers';
import WindowFunction from './WindowFunction';

export var apply = fftCooleyTurkey;
export var inverse = inverseFftCooleyTurkey;
export interface FourierTransform extends Array<number> {
}

export function test(original: number[], dftExpected: number[], tolerance: number) : boolean {
    function isWithinTolerance(actual: number, expected: number, tolerance: number){
        return Math.abs(actual - expected) < tolerance;
    }
    var success = true;
    tolerance = tolerance || 0.00000001;
    var dftActual = fftCooleyTurkey(original);
    for(let i=0; i<dftExpected.length; i++){
        if(!isWithinTolerance(dftActual[i], dftExpected[i], tolerance)){
            success = false;
            let printActualToleranceFormatted = Math.round(dftActual[i] / tolerance) * tolerance;
            console.error('DFT mismatch at index', i, '-- expected', dftExpected[i], 'but was', printActualToleranceFormatted);
        }
    }
    var idftActual = inverseFftCooleyTurkey(dftActual);
    for(let i=0; i<original.length; i++){
        if(!isWithinTolerance(idftActual[i], original[i], tolerance)){
            success = false;
            let printActualToleranceFormatted = Math.round(idftActual[i] / tolerance) * tolerance;
            console.error('IDFT mismatch at index', i, '-- expected', original[i], 'but was', printActualToleranceFormatted);
        }
    }
    return success;
}

export function time(options: any) : number {
    options = options || {};
    var count = options.count || 4096;
    var times = options.times || 100;
    var wave: number[] = [];
    var i: number;
    for(i=0; i<count; i++){
        wave.push(Math.random() * 2 - 1);
    }
    var start = new Date();
    var dft: FourierTransform;
    for(i=0; i<times; i++){
        dft = fftCooleyTurkey(wave, options);
    }
    var end1 = new Date();
    var newWave: number[];
    for(i=0; i<times; i++){
        newWave = inverseFftCooleyTurkey(dft);
    }
    var end2 = new Date();

    console.log('Length:', count);
    console.log('Times:', times);
    console.log('FFT Time:', end1.valueOf() - start.valueOf());
    console.log('IFFT Time:', end2.valueOf() - end1.valueOf());
    console.log('Total Time:', end2.valueOf() - start.valueOf());
    return end2.valueOf() - start.valueOf();
}

var makeFunctions: {
    [name: string]: (length: number, options: any) => WindowFunction;
};

makeFunctions = WindowFunction.make;

export function fftCooleyTurkey(data: number[], options?: {
    start?: number;
    length?: number;
    zeroPhase?: boolean;
    fromComplex?: boolean;
    flatComplex?: boolean;
    window?: any;
}) : FourierTransform {
    options = options || {};
    var start = options.start || 0;
    var length = options.length || data.length;
    var zeroPhase = options.zeroPhase || false;
    var isFlatComplex = options.flatComplex || false;
    var windowFunc = options.window || false;

    if(windowFunc){
        if(windowFunc instanceof String){
            windowFunc = makeFunctions[windowFunc];
            if(windowFunc){
                windowFunc = windowFunc(length);
            }
        } else if(!(windowFunc instanceof WindowFunction)){
            windowFunc = false;
        }
    }

    if(isFlatComplex){
        data = cah.take(data, start * 2, length * 2);
    } else {
        data = cah.takeAndAddComplex(data, start, length);
    }

    if(zeroPhase){
        zeroPadSymmetric(data);
        zeroPhaseShift(data);
    } else {
        zeroPadRight(data);
    }

    if(windowFunc){
        data = cah.applyWindow(data, windowFunc);
    }

    bitwiseReindex(data);
    danielsonLanczos(data, false);

    return <FourierTransform>data;
}

export function inverseFftCooleyTurkey(data: FourierTransform, options?: {
    flatComplexOut?: boolean,
    trimLength?: number
}){
    options = options || {};
    var flatComplexOut = options.flatComplexOut || false;
    var trimLength = options.trimLength || data.length / 2;
    var i: number, count: number, start: number, end: number;

    bitwiseReindex(data);
    danielsonLanczos(data, true);

    count = data.length / 2;
    if(flatComplexOut){
        start = (data.length - trimLength) / 2;
        end = start + trimLength;
        for(i=start; i<end; i++){
            data[i] = data[i] / count;
        }
        data = <FourierTransform>cah.take(<number[]>data, start, trimLength);
        return data;
    } else {
        start = (data.length / 2) - trimLength;
        end = start + (trimLength * 2);
        for(i=start; i<end; i+=2){
            data[i] = data[i] / count;
        }
        return cah.takeAndRemoveComplex(<number[]>data, start, trimLength * 2);
    }
}

function danielsonLanczos(data: number[], invert?: boolean){
    var n: number, mMax: number, m: number, j: number, iStep: number, i: number, wTemp: number,
        wr: number, wpr: number, wpi: number, wi: number, theta: number, tempR: number, tempI: number;

    n = data.length;
    mMax=2;
    while (n>mMax) {
        iStep = mMax<<1;
        theta = -(2 * Math.PI / mMax);
        if(invert) { theta = theta * -1; }
        wTemp = Math.sin(0.5 * theta);
        wpr = -2 * wTemp * wTemp;
        wpi = Math.sin(theta);
        wr = 1;
        wi = 0;
        for (m=1; m<mMax; m+=2) {
            for (i=m; i<=n; i+=iStep) {
                j = i + mMax;
                tempR = wr * data[j-1] - wi * data[j];
                tempI = wr * data[j] + wi * data[j-1];
                data[j-1] = data[i-1] - tempR;
                data[j] = data[i] - tempI;
                data[i-1] += tempR;
                data[i] += tempI;
            }
            wTemp = wr;
            wr += wTemp * wpr - wi * wpi;
            wi += wi * wpr + wTemp * wpi;
        }
        mMax=iStep;
    }

    return data;
}

function bitwiseReindex(data: number[]){
    var n = data.length;
    var halfN = n>>1;
    var j = 0;
    for(var i=0; i<halfN; i+=2){
        if(j>i){
            cah.swapTwo(data, j, i);
            if(j<halfN){
                cah.swapTwo(data, n-(i+2), n-(j+2));
            }
        }
        let m = halfN;
        while (m>=2 && j>=m) {
            j -= m;
            m = m>>1;
        }
        j += m;
    }
    return data;
}

function isPowerOfTwo(v: number){
    return v && !(v & (v - 1));
}

function nextPowerOfTwo(v: number){
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
}

function zeroPadRight(data: number[]){
    var length = data.length;
    if(isPowerOfTwo(length)){
        return;
    }
    length = nextPowerOfTwo(length);
    while(data.length < length){
        data.push(0);
    }
}

function zeroPadSymmetric(data: number[]){
    var length = data.length;
    if(isPowerOfTwo(length)){
        return;
    }
    var newLength = nextPowerOfTwo(length);
    var diff = newLength - length;
    var front = (diff / 2) << 0;
    var back = diff - front;
    var i: number;
    for(i=0; i<front; i++){
        data.splice(0, 0, 0);
    }
    for(i=0; i<back; i++){
        data.push(0);
    }
}

function zeroPhaseShift(data: number[]){
    var length = data.length;
    var halfLength = length / 2;
    for(var i=0; i<halfLength; i+=2){
        cah.swapTwo(data, i, length - i - 1);
    }
}