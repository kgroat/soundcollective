/**
 * Created by kevin on 10/11/15.
 */
'use strict';

export interface OscillatorDefinition {
    oscillatorFunction: (time: number, hertz: number, options?: any) => number;
    directiveName: string;
}

export interface PluginModuleDefinition {
    name: string;
    appDefinition: () => void;
    oscillators: OscillatorDefinition[];
}