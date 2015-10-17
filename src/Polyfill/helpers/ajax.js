/**
 * Created by kevin on 10/7/15.
 */

function send(method, url, data, propertyName, errorPropertyName){
    method = method || 'GET';
    url = url || 'about:blank';
    data = data || null;
    propertyName = propertyName || 'responseText';
    errorPropertyName = errorPropertyName || propertyName;
    return new Promise(function(resolve, reject){
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
            var err;
            if (xmlHttp.readyState === 4) {
                if(xmlHttp.status >= 200 && xmlHttp.status < 300) {
                    resolve(xmlHttp[propertyName]);
                } else if(xmlHttp.status >= 400 && xmlHttp < 600){
                    err = new Error("Received error status code: " + xmlHttp.status);
                    err.data = xmlHttp[errorPropertyName];
                    reject(err);
                } else {
                    err = new Error("Unimplemented status code: " + xmlHttp.status);
                    err.data = xmlHttp[errorPropertyName];
                    reject(xmlHttp[errorPropertyName]);
                }
            }
        };
        xmlHttp.open(method.toUpperCase(), url, true); // true for asynchronous
        xmlHttp.send(data);
    });
}

module.exports = {
    send: send,
    get: function get(url, data, propertyName, errorPropertyName){
        return send('GET', url, data, propertyName, errorPropertyName);
    },
    put: function get(url, data, propertyName, errorPropertyName){
        return send('PUT', url, data, propertyName, errorPropertyName);
    },
    post: function get(url, data, propertyName, errorPropertyName){
        return send('POST', url, data, propertyName, errorPropertyName);
    },
    delete: function get(url, data, propertyName, errorPropertyName){
        return send('DELETE', url, data, propertyName, errorPropertyName);
    }
};