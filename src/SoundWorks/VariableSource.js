var helpers = require('./helpers');
var Source = require('./Source');

function VariableSource(options){
    if(this instanceof VariableSource){
        VariableSource.init.call(this, options);
        return this;
    } else {
        return new VariableSource(options);
    }
}

VariableSource.init = function(options){
    if(!options || typeof options.requestData !== 'function'){
        throw new Error('A VariableSource requires a function named requestData');
    }
    var self = this;
    var expectedData = options.expectedData || [];
    var variableRequestData = options.requestData;

    this.data = options.data || {};

    Object.defineProperty(this, 'expectedData', { get: function() { return expectedData; } });

    helpers.extend(this, new Source({
        requestData: function(startPoint, length, sampleRate, tmpData){
            return variableRequestData(startPoint, length, sampleRate, tmpData || self.data);
        }
    }))
};

helpers.extend(VariableSource.prototype, Source.prototype);

Object.freeze(VariableSource);

module.exports = VariableSource;