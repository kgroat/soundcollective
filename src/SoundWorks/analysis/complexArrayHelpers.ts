/**
 * Created by kevin on 10/9/15.
 */
'use strict';

import * as cm from './complexMath';
import ComplexValue from './ComplexValue';
import WindowFunction from './fourier/WindowFunction';

export function each(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => any) : void {
    for(var i=0; i<array.length; i+=2){
        cb(array[i], array[i+1], i>>1, array);
    }
}

export function map<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T) : T[] {
    var output: T[] = [];
    for(var i=0; i<array.length; i+=2){
        output.push(cb(array[i], array[i+1], i>>1, array));
    }
    return output;
}

export function mapFlat<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T) : number[] {
    return flatten(map(array, cb));
}

export function reduce<T>(array: number[], cb: (accumulator: T, r: number, i: number, idx: number, full: number[]) => T, accumulator?: T) : T {
    for(var i=0; i<array.length; i+=2){
        accumulator = cb(accumulator, array[i], array[i+1], i>>1, array);
    }
    return accumulator;
}

export function findIndex(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => boolean) : number {
    for(var i=0; i<array.length; i+=2){
        if(cb(array[i], array[i+1], i>>1, array)){
            return i;
        }
    }
    return -1;
}

export function filter(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => boolean) : number[] {
    var output: number[] = [];
    for(var i=0; i<array.length; i+=2){
        if(cb(array[i], array[i+1], i>>1, array)){
            output.push(array[i]);
            output.push(array[i+1]);
        }
    }
    return output;
}

export function every(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => boolean) : boolean {
    for(var i=0; i<array.length; i+=2){
        if(!cb(array[i], array[i+1], i>>1, array)){
            return false;
        }
    }
    return true;
}

export function some(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => boolean) : boolean {
    for(var i=0; i<array.length; i+=2){
        if(cb(array[i], array[i+1], i>>1, array)){
            return true;
        }
    }
    return false;
}

export function count(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => boolean) : number {
    var count = 0;
    for(var i=0; i<array.length; i+=2){
        if(cb(array[i], array[i+1], i>>1, array)){
            return count++;
        }
    }
    return count;
}

export function sort<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T, ascending?: boolean) : number[] {
    ascending = ascending || false;
    var output: number[] = [];
    var values: T[] = [];
    var idx: number;
    for(var i=0; i<array.length; i+=2){
        let value = cb(array[i], array[i+1], i>>1, array);
        if(ascending){
            idx = findInsertIndexAscending(values, value);
        } else {
            idx = findInsertIndex(values, value);
        }
        values.splice(idx, 0, value);
        output.splice(idx * 2, 0, array[i], array[i+1]);
    }
    return output;
}

export function max<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T) : T {
    var max = cb(array[0], array[1], 0, array);
    for(var i=2; i<array.length; i+=2){
        let tmp = cb(array[i], array[i+1], i>>1, array);
        if(tmp > max){
            max = tmp;
        }
    }
    return max;
}

export function min<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T) : T {
    var min = cb(array[0], array[1], 0, array);
    for(var i=2; i<array.length; i+=2){
        let tmp = cb(array[i], array[i+1], i>>1, array);
        if(tmp < min){
            min = tmp;
        }
    }
    return min;
}

export function maxIndex<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T) : number {
    var max = cb(array[0], array[1], 0, array);
    var idx = 0;
    for(var i=2; i<array.length; i+=2){
        let tmp = cb(array[i], array[i+1], i>>1, array);
        if(tmp > max){
            max = tmp;
            idx = i;
        }
    }
    return idx;
}

export function minIndex<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T) : number {
    var min = cb(array[0], array[1], 0, array);
    var idx = 0;
    for(var i=2; i<array.length; i+=2){
        let tmp = cb(array[i], array[i+1], i>>1, array);
        if(tmp < min){
            min = tmp;
            idx = i;
        }
    }
    return idx;
}

export function average(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => number) : number {
    var avg = 0;
    for(var i=0; i<array.length; i+=2){
        avg += cb(array[i], array[i+1], i>>1, array);
    }
    return avg / (array.length / 2);
}

export function unzip(array: number[]) : number[][] {
    var real: number[] = [];
    var imaginary: number[] = [];
    for(var i=0; i<array.length; i+=2){
        real.push(array[i]);
        imaginary.push(array[i+1]);
    }
    return [real, imaginary];
}

export function hydrateArrays(array: number[]) : number[][] {
    return map(array, function(r, i){
        return [r, i];
    });
}

export function hydrateValues(array: number[]) : ComplexValue[] {
    return map<ComplexValue>(array, function(r, i) : ComplexValue {
        return new ComplexValue(r, i);
    });
}

export function flatten<T>(array: T[], flattener?: (output: number[], value: T, idx: number, full: T[]) => any){
    flattener = flattener ||
        function(output: number[], value: any){
            if(value instanceof Array){
                output.push(value[0]);
                output.push(value[1]);
            } else if (value instanceof ComplexValue
                || (value && typeof value.real === 'number' && typeof value.imaginary === 'number')) {
                output.push(value.real);
                output.push(value.imaginary);
            } else {
                output.push(value);
            }
        };
    var output: number[] = [];
    for(var i=0; i<array.length; i++){
        flattener(output, array[i], i>>1, array);
    }
    return output;
}

export function merge(realArray: number[], imaginaryArray: number[]) : number[] {
    var output: number[] = [];
    for(var i=0; i<realArray.length; i++){
        output.push(realArray[i]);
        output.push(imaginaryArray[i]);
    }
    return output;
}

export function applyInPlace(array: number[], inIndex: number, outIndex: number, r2: number, i2: number, operation: cm.ComplexFormFunction) : void {
    var r1 = array[inIndex];
    var i1 = array[inIndex + 1];
    array[outIndex] = operation.real(r1, i1, r2, i2);
    array[outIndex + 1] = operation.imaginary(r1, i1, r2, i2);
}

export function swap(array: number[], i: number, j: number) : void {
    var tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
}

export function swapTwo(array: number[], i: number, j: number) : void {
    swap(array, i, j);
    swap(array, i+1, j+1);
}


export function take(data: number[], start: number, length: number) : number[] {
    var tmpData: number[] = [];
    for(var i=start; i<start+length; i++){
        tmpData.push(data[i] || 0);
    }
    return tmpData;
}

export function takeAndAddComplex(data: number[], start: number, length: number) : number[] {
    var tmpData: number[] = [];
    for(var i=start; i<start+length; i++){
        tmpData.push(data[i] || 0);
        tmpData.push(0);
    }
    return tmpData;
}

export function takeAndRemoveComplex(data: number[], start: number, length: number) : number[] {
    var tmpData: number[] = [];
    for(var i=start; i<start+length; i+=2){
        tmpData.push(data[i] || 0);
    }
    return tmpData;
}

export function sortIndex<T>(array: number[], cb: (r: number, i: number, idx: number, full: number[]) => T, ascending?: boolean) : number[] {
    ascending = ascending || false;
    var indexes: number[] = [];
    var values: T[] = [];
    var idx: number;
    for(var i=0; i<array.length; i+=2){
        let value = cb(array[i], array[i+1], i>>1, array);
        if(ascending){
            idx = findInsertIndexAscending(values, value);
        } else {
            idx = findInsertIndex(values, value);
        }
        values.splice(idx, 0, value);
        indexes.splice(idx, 0, i / 2);
    }
    return indexes;
}

export function applyWindow(array: number[], windowFunc: WindowFunction, inPlace?: boolean, isComplex?: boolean) : number[]{
    isComplex = isComplex !== undefined ? isComplex : true;
    inPlace = inPlace !== undefined ? inPlace : true;
    var i: number;

    if(inPlace){
        if(isComplex){
            for(i=0; i<array.length; i+=2){
                array[i] = array[i] * windowFunc.values[i/2];
                array[i+1] = array[i+1] * windowFunc.values[i/2];
            }
        } else {
            for(i=0; i<array.length; i++){
                array[i] = array[i] * windowFunc.values[i];
            }
        }
    } else {
        if(isComplex){
            array = mapFlat(array, function(r: number, i: number, idx: number){
                var tmp = windowFunc.values[idx];
                return [tmp * r, tmp * i];
            });
        } else {
            var newVals: number[] = [];
            for(i=0; i<array.length; i++){
                newVals.push(windowFunc.values[i] * array[i]);
            }
            array = newVals;
        }
    }

    return array;
}

// O---------------O
// |               |
// |    PRIVATE    |
// |               |
// O---------------O
function findInsertIndexAscending<T>(sortedArray: T[], value: T) : number {
    var top = sortedArray.length;
    var bottom = 0;
    var idx = (sortedArray.length / 2) << 0;
    while(top > bottom){
        if(sortedArray[idx] < value){
            top = idx;
        } else if(sortedArray[idx] > value){
            bottom = idx;
        } else {
            return idx;
        }
        idx = bottom + ((top - bottom) / 2) << 0;
    }
    return idx;
}

function findInsertIndex<T>(sortedArray: T[], value: T) : number {
    var top = sortedArray.length;
    var bottom = 0;
    var idx = (sortedArray.length / 2) << 0;
    while(top > bottom){
        if(sortedArray[idx] > value){
            top = idx;
        } else if(sortedArray[idx] < value){
            bottom = idx;
        } else {
            return idx;
        }
        idx = bottom + ((top - bottom) / 2) << 0;
    }
    return idx;
}