/**
 * Created by Kevin on 4/14/2015.
 */
'use strict';

import BaseSource from './BaseSource';

console.log(typeof BaseSource);
console.log(BaseSource);

class VariableSource extends BaseSource {
    data: any;

    constructor(options: { requestData: (startPoint: number, length: number, sampleRate: number, tmpData: any) => number[]; expectedData?: string[]; data: any }) {
        var self = this;
        var expectedData = options.expectedData || [];
        var variableRequestData = options.requestData;

        this.data = options.data || {};

        Object.defineProperty(this, 'expectedData', { value: expectedData });

        super({
            requestData: function(startPoint: number, length: number, sampleRate: number, tmpData: any){
                return variableRequestData(startPoint, length, sampleRate, tmpData || self.data);
            }
        });

        super(options);
    }
}

export default VariableSource;