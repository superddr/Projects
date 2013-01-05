var path = require('path');
var http = require('http');
var fs = require("fs");
var url = require("url");
var appPort = 8000;
var domain = require("domain").create();
domain.on("error", function (e) {console.log('Caught error', e);});
domain.run(function () {
// cache.manifest
    watchFolder("pages", watchManifest);
    watchFolder("src", watchAPI);

    var connect = require('connect');
    var server;

    function startServer() {
        var api = require("./src/api.js");

        var app = connect()
                .use('/api.aspx', connect.cookieParser())
                .use('/api.aspx', connect.bodyParser())
                .use('/api.aspx', api.init)
                .use('/api.aspx', api.auth)
                .use('/api.aspx', api.api)
                .use('/api.aspx', api.exit)
                .use(connect.static('pages', {index:'index.htm'}))
            ;
        server = http.createServer(app);
        server.listen(appPort);
    }

    startServer();

    //a tool to watch the deeper folder
    function watchFolder(folder, watch) {
        fs.readdirSync(folder).forEach(function (item) {
            try {
                var state = fs.statSync(folder + '/' + item);
            } catch (err) {
                return;
            }
            if (state.isDirectory())
                watchFolder(folder + '/' + item, watch);

            fs.watch(folder + '/' + item, watch);
        });
    }

//watchAPI files
    function watchAPI(event, filename) {
        if(event != "change")return;
        var p = process.cwd() + "\\src\\" + filename;
        console.log("api file:'" + p + "' Updated!");
        delete require.cache[p];
        try{
            server.close(startServer);
        }catch(e){
            startServer();
        }
    }



//cache.manifest
    function watchManifest(event, filename) {
        if (['png', 'jpg', 'css', 'js', 'htm', 'html'].indexOf(path.extname(filename).substr(1)) < 0)return;

        fs.open("pages/cache.manifest", "w", 0666, function (e, fd) {
            if (e) return;

            fs.writeSync(fd, "CACHE MANIFEST\r\n# Last Modify" + new Date().toGMTString() + "\nCACHE:\r\n");
            walk("pages");
            fs.writeSync(fd, "NETWORK:\r\n*\r\n");
            fs.closeSync(fd);

            function walk(dir) {
                fs.readdirSync(dir).forEach(function (item) {
                    try {
                        var state = fs.statSync(dir + '/' + item);
                    } catch (err) {
                        return;
                    }
                    if (state.isDirectory())
                        walk(dir + '/' + item);
                    else if (state.isFile() && ['png', 'jpg', 'css', 'js'].indexOf(path.extname(item).substr(1)) >= 0)
                        fs.writeSync(fd, dir.substr(6) + '/' + item + "\r\n");
                });
            }
        });
    };
})
