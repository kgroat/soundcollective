/**
 * Created by Kevin on 4/14/2015.
 */
/// <reference path="../../../typings/tsd.d.ts" />

export var midi: MIDIAccess;

export var promise = navigator.requestMIDIAccess().then(function(access){
    midi = access;
});
