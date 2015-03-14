var usingSetPrototypeOf = function(self, superObject){
    Object.setPrototypeOf(self, superObject);
}

var usingProto = function(self, superObject){
    self.__proto__ = superObject;
}

module.exports = {
    extend: function(self, superObject){
        var originalPrototype = self.__proto__;
        var superConstructorPrototype = superObject.constructor.prototype;
        var setPrototype;
        if(typeof Object.setPrototypeOf === 'function'){
            setPrototype = usingSetPrototypeOf;
        } else {
            setPrototype = usingProto;
        }

        setPrototype(self, superObject);
        var currentPrototype = self;
        while(currentPrototype.__proto__ !== superConstructorPrototype){
            currentPrototype = currentPrototype.__proto__;
        }
        setPrototype(currentPrototype, originalPrototype);
        return self;
    }
}