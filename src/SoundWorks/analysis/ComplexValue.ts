/**
 * Created by kevin on 10/7/15.
 */
'use strict';

var shouldFreeze = true;

class ComplexValue {
    constructor(real: number, imag: number) {
        this.real = real;
        this.imaginary = imag;
        if(shouldFreeze){
            this.magnitude = Math.sqrt(real * real + imag * imag);
            this.angle = Math.atan2(imag, real);
            Object.freeze(this);
        }
    }
    real: number;
    imaginary: number;
    magnitude: number;
    angle: number;
    add(other: ComplexValue){ return complexAdd(this, other); }
    subtract(other: ComplexValue){ return complexSubtract(this, other); }
    multiply(other: ComplexValue){ return complexMultiply(this, other); }
    divide(other: ComplexValue){ return complexDivide(this, other); }
    setMagnitude(newMagnitude: number){ return complexSetMagnitude(this, newMagnitude); }
    setAngle(newAngle: number){ return complexSetAngle(this, newAngle); }
    findRoots(pow: number) { return complexRoots(this, pow); }
    exp(pow: number){ return complexExponent(this, pow); }
    findConjugate(){ return complexConjugate(this); }
}

module ComplexValue {
    export var fromPolarForm = function funcPolarForm(magnitude: number, angle: number) : ComplexValue {
        shouldFreeze = false;
        var output : ComplexValue;

        try {
            output = new ComplexValue(
                Math.cos(angle) * magnitude,
                Math.sin(angle) * magnitude);
            output.magnitude = magnitude;
            output.angle = angle;
            Object.freeze(output);
        }catch(e){
            output = null;
        }

        shouldFreeze = true;
        return output;
    };
}

function complexAdd(addend1: ComplexValue, addend2: ComplexValue) : ComplexValue {
    return new ComplexValue(
        addend1.real + addend2.real,
        addend1.imaginary + addend2.imaginary);
}

function complexSubtract(minuend: ComplexValue, subtrahend: ComplexValue) : ComplexValue {
    return new ComplexValue(
        minuend.real - subtrahend.real,
        minuend.imaginary - subtrahend.imaginary);
}

function complexMultiply(factor1: ComplexValue, factor2: ComplexValue) : ComplexValue {
    return new ComplexValue(
        factor1.real * factor2.real - factor1.imaginary * factor2.imaginary,
        factor1.real * factor2.imaginary + factor1.imaginary * factor2.real);
}

function complexDivide(numerator: ComplexValue, denominator: ComplexValue) : ComplexValue{
    var denominatorConjugate = denominator.findConjugate();
    numerator = numerator.multiply(denominatorConjugate);
    denominator = denominator.multiply(denominatorConjugate);
    return new ComplexValue(
        numerator.real / denominator.real,
        numerator.imaginary / denominator.real)
}

function complexSetAngle(original: ComplexValue, newAngle: number) : ComplexValue {
    return ComplexValue.fromPolarForm(original.magnitude, newAngle);
}

function complexSetMagnitude(original: ComplexValue, newMagnitude: number) : ComplexValue {
    return ComplexValue.fromPolarForm(newMagnitude, original.angle);
}

function complexRoots(original: ComplexValue, pow: number) : ComplexValue[] {
    pow = pow || 2;
    pow = pow<<0;

    var magnitude = original.magnitude;
    var angle = original.angle;
    var newMagnitude = Math.pow(magnitude, 1/pow);
    var output: ComplexValue[] = [];
    for(var i=0; i<pow; i++){
        var newAngle = (angle + (2 * Math.PI) * i) / pow;
        output.push(ComplexValue.fromPolarForm(newMagnitude, newAngle));
    }

    return output;
}

function complexExponent(original: ComplexValue, pow: number) : ComplexValue {
    return ComplexValue.fromPolarForm(Math.pow(original.magnitude, pow), original.angle * pow);
}

function complexConjugate(original: ComplexValue) : ComplexValue{
    return new ComplexValue(
        original.real,
        -original.imaginary);
}

export default ComplexValue;