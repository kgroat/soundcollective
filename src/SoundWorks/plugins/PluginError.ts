/**
 * Created by kevin on 6/11/15.
 */
'use strict';

class PluginError implements Error {
    constructor(message: string) {
        this.message = message;
    }
    name:string = 'PluginError';
    message:string;
}

export default PluginError;