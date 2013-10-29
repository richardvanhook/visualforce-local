var httpProxy   = require('http-proxy')
  , https       = require('https')
  , parseString = require('xml2js').parseString
  , _           = require('underscore')


function sanitize(config){
  config = _.defaults(
    config || {},
    {   host    : 'login.salesforce.com'
      , username: ''
      , password: ''
    }
  )
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
  return config
}

function initProxyHandler(){
  var proxy     = new httpProxy.RoutingProxy()
  return function(req, res){
    _ref1 = req.url.match(/\/([^\/]+)(.*)/)
    if(_ref1) ignore = _ref1[0], hostname = _ref1[1], path = _ref1[2]
    if(!_ref1){
      res.writeHead(400, 'Bad Request: no host')
      res.end()
      return
    }
    _ref2 = hostname.split(/:/), host = _ref2[0], port = _ref2[1]
    req.url = path
    if(req.headers['x-authorization']) 
      req.headers['authorization'] = req.headers['x-authorization']
    if(!req.headers['authorization']){
      res.writeHead(400, 'Bad Request: no session id')
      res.end()
      return
    }
    return proxy.proxyRequest(req, res, { target: {
        host: host
      , port: 443
      , https: true
      , buffer: httpProxy.buffer(req)
      , rejectUnauthorized: false
    }})
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
  }
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
    )(config)
}

function parseSoapFaultError(str,callback){
  parseString(str, function (err, result) {
    result = result['soapenv:Envelope']['soapenv:Body'][0]['soapenv:Fault'][0]
    callback(result['faultcode'] + '|' + result['faultstring'])
  })
}

function parseSessionId(str,callback){
  parseString(str, function (err, result) {
    result = result['soapenv:Envelope']['soapenv:Body'][0]
      ['loginResponse'][0]['result'][0]
    callback(result['sessionId'])
  })
}

module.exports.init = function(config, callback){
  config = sanitize(config)
  process.stdout.write('Getting session id from ' + config.host + '...')
  var req = https.request(buildLoginRequestOptions(config), function(res) {
      res.on('data', function(d) {
        if(res.statusCode == 500)
          parseSoapFaultError(d.toString(),function(err){
            throw new Error('Failed to retrieve session id!\n' + err);
          })
        else 
          parseSessionId(d.toString(),function(sessionId){
            process.stdout.write('done\n')
            callback(config.host,sessionId,initProxyHandler())
          })
      })
  })
  req.write(buildLoginRequestBody(config))
  req.end()
  req.on('error', function(e) {
    throw new Error('Failed to retrieve session id!\n' + d);
  })
}