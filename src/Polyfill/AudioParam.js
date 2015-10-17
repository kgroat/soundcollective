/**
 * Created by kevin on 10/7/15.
 */

module.exports = function(global){
    var useAudioParam = typeof global.AudioParam !== 'undefined';

    var shouldThrow = true;

    function PolyfillAudioParam(options){
        if(shouldThrow){
            throw new Error("Illegal constructor invocation.");
        }
        var context = options.context;

        var defaultValue = options.defaultValue;

        this.__proto__ = Object.prototype;
        this.value = defaultValue;
        Object.defineProperty(this, 'defaultValue', { value: defaultValue });
        this.__proto__ = PolyfillAudioParam.prototype;

        var scheduledValues = [];

        function addScheduleItem(item){
            var i=0;
            if(scheduledValues.length) {
                while (scheduledValues[i].scheduledTime <= item.scheduledTime) {
                    i++;
                }
            }
            scheduledValues.splice(i, 0, item);
            return i;
        }

        this.setValueAtTime = function(value, startTime){
            addScheduleItem({
                scheduledTime: startTime,
                value: value,
                type: 'set'
            });
        };

        this.linearRampToValueAtTime = function(value, endTime){
            addScheduleItem({
                scheduledTime: endTime,
                value: value,
                type: 'ramp'
            });
        };

        this.exponentialRampToValueAtTime = function(value, endTime){
            addScheduleItem({
                scheduledTime: endTime,
                value: value,
                type: 'exponential'
            });
        };

        this.setTargetAtTime = function(value, endTime){
            addScheduleItem({
                scheduledTime: endTime,
                value: value,
                type: 'target'
            });
        };

        this.setValueCurveAtTime = function(value, endTime){
            addScheduleItem({
                scheduledTime: endTime,
                value: value,
                type: 'ramp'
            });
        };

        var lastScheduled = null;
        var nextScheduled = null;
        function getValuesAtTime(t, duration){
            duration = duration || 0;
            var output = [];
            if(scheduledValues.length) {
                while(scheduledValues[0].scheduledTime < t) {
                    lastScheduled = scheduledValues.splice(0, 1)[0];
                }
                nextScheduled = scheduledValues[0];
            }
        }

        return this;
    }

    if(useAudioParam){
        PolyfillAudioParam.prototype = Object.create(global.AudioParam);
        Object.defineProperty(PolyfillAudioParam.prototype, 'constructor', { value: PolyfillAudioParam });
    } else {
        global.AudioParam = PolyfillAudioParam;
    }

    module.exports.new = function(options){
        shouldThrow = false;
        var output = new PolyfillAudioParam(options);
        shouldThrow = true;
        return output;
    };
};
