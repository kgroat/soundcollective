/**
 * Created by kevin on 10/9/15.
 */
'use strict';

import * as ah from './complexArrayHelpers';

function visualize(array: number[], options?: {
    yTransform?: (y: number) => number;
    minX?: number;
    width?: number;
    minY?: number;
    height?: number;
    padding?: number;
    canvas?: HTMLCanvasElement;
    size?: {
        width: number;
        height: number;
    }
}){
    options = options || {};
    var yTransform = options.yTransform || identity;
    var minX = options.minX || 0;
    var width = options.width || (array.length - minX);
    var minY = options.minY || ah.min(array, yTransform);
    var height = options.height || (ah.max(array, yTransform) - minY);
    var padding = options.padding || 80;
    var canvas = options.canvas || document.createElement('canvas');

    var size = options.size || {
            width: 0,
            height: 0
        };
    if(!options.canvas) {
        canvas.style.width = (canvas.width = size.width || 800).toString(10);
        canvas.style.height = (canvas.height = size.height || 400).toString(10);
    }
    Object.defineProperties(size, {
        width: {
            get: function(){ return canvas.width; },
            set: function(newVal) {
                canvas.style.width = canvas.width = newVal;
                redraw();
                return canvas.width;
            }
        },
        height: {
            get: function(){ return canvas.height; },
            set: function(newVal) {
                canvas.style.height = canvas.height = newVal;
                redraw();
                return canvas.height;
            }
        }
    });

    function mapToReal(val: number, min: number, size: number, real: number, addPad?: boolean): number {
        return (real - padding) * (val - min) / size + (addPad ? padding : 0);
    }

    var currentTimeout: number;

    function redraw(){
        if(currentTimeout){
            return;
        }
        currentTimeout = setTimeout(function(){
            currentTimeout = null;
            immediateRedraw();
        }, 0);
    }

    function immediateRedraw(){
        var maxX = minX + width;
        var i: number, point1: number, point2: number;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(padding, 0, canvas.width - padding, canvas.height - padding);
        ctx.strokeStyle = '#4462b0';
        ctx.lineWidth = 2;
        for(i=minX+1; i<maxX; i++){
            point1 = yTransform(array[i-1]);
            point2 = yTransform(array[i]);
            if(typeof point1 !== 'number' || typeof point2 !== 'number'){
                continue;
            }
            ctx.beginPath();
            ctx.moveTo(mapToReal(i-1, minX, width, canvas.width, true),
                mapToReal(point1, minY, height, canvas.height, false));
            ctx.lineTo(mapToReal(i, minX, width, canvas.width, true),
                mapToReal(point2, minY, height, canvas.height, false));
            ctx.stroke();
        }
        ctx.fillStyle = '#b04462';
        for(i=minX; i<maxX; i++){
            point1 = yTransform(array[i]);
            if(typeof point1 !== 'number'){
                continue;
            }
            ctx.beginPath();
            ctx.arc(mapToReal(i, minX, width, canvas.width, true),
                mapToReal(point1, minY, height, canvas.height, true),
                3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    return {
        el: canvas,
        setSize: function(w: number, h: number){
            size.width = w;
            size.height = h;
        }
    };

    //var mouseStart = null;
    //canvas.addEventListener('mousedown', function(ev){
    //    mouseStart = mapPoint(ev);
    //});

    //canvas.addEventListener('mouseup', function(ev){
    //    var mouseEnd = mapPoint(ev);
    //    var left = Math.min(mouseStart.x, mouseEnd.x);
    //    var right = Math.max(mouseStart.x, mouseEnd.x);
    //    var top = Math.min(mouseStart.y, mouseEnd.y);
    //    var bottom = Math.max(mouseStart.y, mouseEnd.y);
    //});
}

function identity<T>(self: T): T { return self; }

function mapPoint(ev: MouseEvent){
    var target = <HTMLElement>ev.target;
    var rect = target.getBoundingClientRect();
    var point = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top
    };
    return point;
}

export default visualize;