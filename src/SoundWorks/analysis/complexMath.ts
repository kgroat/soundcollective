/**
 * Created by kevin on 10/9/15.
 */
'use strict';

import ComplexValue from './ComplexValue';

export interface ComplexFormFunction {
    real: (r1: number, i1: number, r2: number, i2: number) => number;
    imaginary: (r1: number, i1: number, r2: number, i2: number) => number;
}
export interface ArrayFormFunction extends ComplexFormFunction {
    (r1: number, i1: number, r2: number, i2: number): number[];
}
export interface ValueFormFunction extends ComplexFormFunction {
    (r1: number, i1: number, r2: number, i2: number): ComplexValue;
}

export function magnitude(r: number, i: number) : number {
    return Math.sqrt(r*r + i*i);
}
export function angle(r: number, i: number) : number {
    return Math.atan2(i, r);
}

export module real {
    export function add(r1: number, i1: number, r2: number, i2: number) : number {
        return r1 + r2;
    }
    export function subtract(r1: number, i1: number, r2: number, i2: number) : number {
        return r1 - r2;
    }
    export function multiply(r1: number, i1: number, r2: number, i2: number) : number {
        return r1 * r2 - i1 * i2;
    }
    export function divide(r1: number, i1: number, r2: number, i2: number) : number {
        return (r1 * r2 + i1 * i2) / (r2 * r2 + i2 * i2);
    }
}
export module imaginary {
    export function add(r1: number, i1: number, r2: number, i2: number) : number {
        return i1 + i2;
    }
    export function subtract(r1: number, i1: number, r2: number, i2: number) : number {
        return i1 - i2;
    }
    export function multiply(r1: number, i1: number, r2: number, i2: number) : number {
        return r1 * i2 + i1 * r2;
    }
    export function divide(r1: number, i1: number, r2: number, i2: number) : number {
        return (i1 * r2 - r1 * i2) / (r2 * r2 + i2 * i2);
    }
}
export module array {
    export var add = makeArrayForm(real.add, imaginary.add);
    export var subtract = makeArrayForm(real.subtract, imaginary.subtract);
    export var multiply = makeArrayForm(real.multiply, imaginary.multiply);
    export var divide = makeArrayForm(real.divide, imaginary.divide);
}
export module value {
    export var add = makeComplexValueForm(real.add, imaginary.add);
    export var subtract = makeComplexValueForm(real.subtract, imaginary.subtract);
    export var multiply = makeComplexValueForm(real.multiply, imaginary.multiply);
    export var divide = makeComplexValueForm(real.divide, imaginary.divide);
}

function makeArrayForm(realFunc: (r1: number, i1: number, r2: number, i2: number) => number,
                       imaginaryFunc: (r1: number, i1: number, r2: number, i2: number) => number) : ArrayFormFunction {
    var out: ArrayFormFunction = <ArrayFormFunction>function(r1, i1, r2, i2){
        return [out.real(r1, i1, r2, i2), out.imaginary(r1, i1, r2, i2)];
    };
    out.real = realFunc;
    out.imaginary = imaginaryFunc;
    return out;
}
function makeComplexValueForm(realFunc: (r1: number, i1: number, r2: number, i2: number) => number,
                              imaginaryFunc: (r1: number, i1: number, r2: number, i2: number) => number) : ValueFormFunction {
    var out: ValueFormFunction = <ValueFormFunction>function(r1, i1, r2, i2){
        return new ComplexValue(out.real(r1, i1, r2, i2), out.imaginary(r1, i1, r2, i2));
    };
    out.real = realFunc;
    out.imaginary = imaginaryFunc;
    return out;
}