/**
 * Created by kevin on 10/9/15.
 */
'use strict';

import * as cah from '../complexArrayHelpers';
import * as decibels from './decibels';
import * as transform from './transform';

export function findPureTone(dft: transform.FourierTransform) : number {
    return cah.maxIndex(dft, function(r, i){
        return decibels.calcDecibels(r, i);
    });
}

export function toHertz(idx: number, length: number, samplingFrequency?: number) : number {
    samplingFrequency = samplingFrequency || 44100;
    return (samplingFrequency / length) / idx;
}