Enables local development of Visualforce single-page web apps.  

Not intended for production use - intended for development only.

### Dependencies

* [git](https://help.github.com/articles/set-up-git)
* [Node.js](http://nodejs.org/download/)

### Hacking

    #install
    cd /to/somewhere
    git clone git@github.com:richardvanhook/visualforce-local.git
    cd visualforce-local/example
    npm install

    #configure/start server
    export SFDC_HOST=test.salesforce.com
    export SFDC_USERNAME=john.doe@example.com
    export SFDC_PASSWORD=XXXXXXX
    node server.js

    #navigate browser to http://localhost:5000

You should see something like the following:

![ScreenShot](https://raw.github.com/richardvanhook/visualforce-local/master/screenshot.png)
