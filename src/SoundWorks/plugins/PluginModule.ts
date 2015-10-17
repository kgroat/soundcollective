/**
 * Created by kevin on 6/11/15.
 */
'use strict';

import PluginContext from './PluginContext';
import PluginError from './PluginError';
import * as interfaces from './interfaces';



class PluginModule {
    name: string;
    constructor(definition: interfaces.PluginModuleDefinition, ctx: PluginContext) {
        if(definition.name === null || definition.name === undefined || definition.name.length === 0) {
            throw new PluginError("")
        }

        this.name = definition.name;
    }
}

export default PluginModule;