
function Source(options){
    if(this instanceof Source){
        Source.init.call(this, options);
        return this;
    } else {
        return new Source(options);
    }
}

Source.init = function(options){
    if(!options || typeof options.requestData !== 'function'){
        throw new Error('A SoundSource requires a function named requestData');
    }
    this.requestData = options.requestData;
};

Object.freeze(Source);

module.exports = Source;