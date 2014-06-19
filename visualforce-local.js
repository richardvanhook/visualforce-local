var proxy       = require('http-proxy').createProxyServer({})
  , https       = require('https')
  , url         = require('url')
  , parseString = require('xml2js').parseString
  , _           = require('underscore');

function sanitize(config){
  config = _.defaults(
    config || {},
    {   host    : 'login.salesforce.com'
      , username: ''
      , password: ''
    }
  );
  var emptyConfig = _.filter(_.keys(config),function(key){
    return _.isUndefined(config[key]) || config[key].length <= 0;
  })
  if(!_.isEmpty(emptyConfig)){
    var err = 'No configuration found for: ' +
      _.reduce(emptyConfig, function(memo, varName, i){
        return memo + (i==0?'':',') + varName; 
      }, '')
    throw new Error(err);
  }
  return config;
}

function initProxyHandler(){
  return function(req, res){
    "use strict";
    var _ref1 = req.url.match(/\/([^\/]+)(.*)/);
    var ignore, hostname, path;
    if(_ref1) ignore = _ref1[0], hostname = _ref1[1], path = _ref1[2];
    if(!_ref1){
      res.writeHead(400, 'Bad Request: no host');
      res.end();
      return;
    }
    var _ref2 = hostname.split(/:/), host = _ref2[0], port = _ref2[1];
    req.url = path;
    if(req.headers['x-authorization']) 
      req.headers['authorization'] = req.headers['x-authorization'];
    if(!req.headers['authorization']){
      res.writeHead(400, 'Bad Request: no session id');
      res.end();
      return;
    }
    return proxy.web(req, res, { target: 'https://' + host + ':443' });
  }  
}

function buildLoginRequestOptions(config){
  return { 
     hostname: config.host
    ,port: 443
    ,path: '/services/Soap/u/29.0'
    ,method: 'POST'
    ,headers: {
       'Content-Type': 'text/xml;charset=UTF-8'
      ,'SOAPAction': '\'\''
    }
  };
}

function buildLoginRequestBody(config){
  return _.template(
      '<soapenv:Envelope '+
      '    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '+
      '    xmlns:urn="urn:partner.soap.sforce.com">'+
      '   <soapenv:Body>'+
      '      <urn:login>'+
      '         <urn:username><%= username %></urn:username>'+
      '         <urn:password><%= password %></urn:password>'+
      '      </urn:login>'+
      '   </soapenv:Body>'+
      '</soapenv:Envelope>'
    )(config);
}

function parseSoapFaultError(str,callback){
  parseString(str, function (err, result) {
    result = result['soapenv:Envelope']['soapenv:Body'][0]['soapenv:Fault'][0]
    callback(result['faultcode'] + '|' + result['faultstring'])
  });
}

function parseSuccess(str,callback){
  parseString(str, function (err, result) {
    result = result['soapenv:Envelope']['soapenv:Body'][0]
      ['loginResponse'][0]['result'][0];
    callback(url.parse(result['serverUrl'][0]).hostname,result['sessionId']);
  });
}

module.exports.init = function(config, callback){
  config = sanitize(config);
  process.stdout.write('Getting session id from ' + config.host + '...');
  var req = https.request(buildLoginRequestOptions(config), function(res) {

    var dataString = '';
    res.on('data', function(chunk){ dataString += chunk.toString();});
    res.on('end', function(){
      if(res.statusCode == 500)
        parseSoapFaultError(dataString,function(err){
          process.stdout.write('error\n');
          throw new Error('Failed to retrieve session id!\n' + err);
        });
      else 
      parseSuccess(dataString,function(serverHost,sessionId){
        process.stdout.write('done\n');
        callback(serverHost,sessionId,initProxyHandler());
      });
    });

  })
  req.write(buildLoginRequestBody(config));
  req.end();
  req.on('error', function(e) {
    throw new Error('Failed to retrieve session id!\n' + d);
  });
}