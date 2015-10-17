/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

/// <reference path="../../../typings/tsd.d.ts" />

export var midi: any; //MIDIAccess

export var promise = (<any>navigator).requestMIDIAccess().then(function(access: any /* MIDIAccess */){
    midi = access;
});
