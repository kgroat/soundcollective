/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

class BaseSource {
    requestData: (startPoint: number, length: number, sampleRate: number, buffers: number[][], options?: any) => boolean;

    constructor(options: { requestData: (startPoint: number, length: number, sampleRate: number, buffers: number[][], options?: any) => boolean }){
        this.requestData = options.requestData;
    }
}

export default BaseSource;