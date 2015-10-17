/**
 * Created by kevin on 10/9/15.
 */
'use strict';

import * as cah from '../complexArrayHelpers';
import * as cm from '../complexMath';
import * as transform from './transform';

var minutia = 0.00000001;

export function calcAllDecibels(dft: transform.FourierTransform) : number[] {
    return cah.map(dft, function(r, i){
        return calcDecibels(r, i, dft.length);
    });
}

export function calcMaxDecibels(dft: transform.FourierTransform) : number{
    return cah.max(dft, function(r, i){
        return calcDecibels(r, i, dft.length);
    });
}

export function calcDecibels(r: number, i: number, l?: number) : number {
    l = l || 1;
    return 20 * log10((cm.magnitude(r, i) + minutia) / l);
}

var e10 = Math.log(10);

function log10(val: number) : number {
    return Math.log(val) / e10;
}