var helpers = require('./helpers');
var Source = require('./Source');

function SampleSource(options){
    if(this instanceof SampleSource){
        SampleSource.init.call(this, options);
        return this;
    } else {
        return new SampleSource(options);
    }
}

SampleSource.init = function(options){
    options = options || {};
    var sample = options.sample;
    var repeat = options.repeat || false;
    var requestData;
    if(repeat){
        requestData = function(startPoint, length){
            var subSample = [];
            for(var i=0; i<length; i++){
                subSample.push(sample[(i+startPoint)%sample.length]);
            }
            return subSample;
        };
    } else {
        requestData = function(startPoint, length){
            var subSample = [];
            for(var i=0; i<length; i++){
                subSample.push(sample[i+startPoint] || 0);
            }
            return subSample;
        };
    }
    helpers.extend(this, new Source({
        requestData: requestData
    }));
};

helpers.extend(SampleSource.prototype, Source.prototype);

Object.freeze(SampleSource);

module.exports = SampleSource;