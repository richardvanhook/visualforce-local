var   express          = require('express'          )
    , ejs              = require('ejs'              )
    , visualforceLocal = require('visualforce-local');

visualforceLocal.init(

  // Connection configuration.
  {   host    : process.env.SFDC_HOST
    , username: process.env.SFDC_USERNAME
    , password: process.env.SFDC_PASSWORD
  },

  // Callback handler.  Will be executed if session id 
  // retrieved successfully.
  function startExpress(serverHost, sessionId, proxyHandler){
    var app = express();
    app.engine('.html', ejs.__express);
    app.set('views', __dirname);
    app.set('view engine', 'html');
    app.use(app.router);
    app.get('/', function(req, res){res.render('index', {
      serverHost: serverHost, 
      sessionId : sessionId
    });});
    app.all('/*.salesforce.com/*' , proxyHandler    );
    app.listen(process.env.PORT || 5000);
  }
);