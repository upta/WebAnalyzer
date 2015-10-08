var http = require("http"),
    url = require("url"),
    fs = require("fs");

var start = function (port) {
    http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });

        var path = req.url.substring(1);

        if (path === "ping") {
            res.end("1");
            return;
        }

        var body = "";

        req.on('data', function (data) {
            body += data;
        });

        req.on('end', function () {
            var linter = linters[path];

            if (linter) {
                var data = JSON.parse(body);
                var result = linter(data.config, data.files);
                res.end(JSON.stringify(result));
            }
        });

    }).listen(port);
}

var linters = {

    eslint: function (config, files) {
        var CLIEngine = require("eslint").CLIEngine;
        var cli = new CLIEngine({ configFile: config });
        var report = cli.executeOnFiles(files);
        return report.results;
    },

    tslint: function (config, files) {
        var tslint = require("tslint");
        var options = {
            formatter: "json",
            configuration: JSON.parse(fs.readFileSync(config, "utf8"))
        };

        var results = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var ll = new tslint(file, fs.readFileSync(file, "utf8"), options);
            results = results.concat(JSON.parse(ll.lint().output));
        }

        return results;
    },

    coffeelint: function (config, files) {
        var linter = require("coffeelint");
        var options = {};
        var results = {};

        var config = JSON.parse(fs.readFileSync(config, "utf8"));
        options.configFile = undefined;
        for (var key in config) {
            options[key] = config[key];
        }

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var literate = !!file.match(/\.(litcoffee|coffee\.md)$/i);
            var result = linter.lint(fs.readFileSync(file, "utf8"), options, literate);
            results[file] = result;
        }

        return results;
    },

    csslint: function (config, files) {
        var linter = require("csslint").CSSLint;

        var options = JSON.parse(fs.readFileSync(config, "utf8"));
        var results = {};

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var result = linter.verify(fs.readFileSync(file, "utf8"), options);

            results[file] = result.messages;
        }

        return results;
    }
}

start(process.argv[2]);