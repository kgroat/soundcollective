/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

class BaseSource {
    requestData: (startPoint: number, length: number, sampleRate: number, options: any) => number[];

    constructor(options: { requestData: (startPoint: number, length: number, sampleRate: number, options: any) => number[] }){
        this.requestData = options.requestData;
    }
}

export default BaseSource;