/*
 * grunt-connect-rewrite
 * https://github.com/viart/grunt-connect-rewrite
 *
 * Copyright (c) 2013 Artem Vitiuk
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs'),
	url = require('url'),
	http = require('http'),
	querystring = require('querystring'),
	utils = module.exports,
    rules = [];

utils.registerRule = function (rule) {

    if (!rule || !rule.from || !rule.to ||
        !(rule.from = rule.from.trim()) ||
        !(rule.from = rule.from.trim())) {
        return false;
    }

    rules.push({
        from: new RegExp(rule.from),
        to: rule.to
    });

    return true;
};

utils.resetRules = function () {
    rules = [];
};

utils.rules = function () {
    return rules;
};

function requireUncached(module){
    delete require.cache[require.resolve(module)];
    return require(module);
}

utils.dispatcher = function (req, res) {
    return function (rule) {
        if (rule.from.test(req.url)) {
			//res.setHeader("Set-Cookie", ["name=joe11", "language=javascript"]);

			if (rule.to.indexOf('require!') === 0) {
				var urlObject = url.parse(req.url);
				// require
				var filepath = urlObject.pathname.replace(rule.from, rule.to).replace('require!', '');
				var parameters = querystring.parse(urlObject.query);
				var data = requireUncached(filepath)(parameters);
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(data));
				return false;
			} else if (rule.to.indexOf('http://') === 0) {
				// internet url
				//console.log('====', req.url.replace(rule.from, rule.to));
				//http.get(req.url.replace(rule.from, rule.to), function(response) {

				http.get(req.url.replace(rule.from, rule.to), function(response) {
					//console.log('STATUS: ' + response.statusCode);
					//console.log('HEADERS: ' + JSON.stringify(response.headers));
					var header = response.headers,
						data = '';

					Object.keys(response.headers).forEach(function (key) {
						res.setHeader(key, response.headers[key]);
					});
					response.setEncoding('utf8');
						//response.cookie('testcookie','testvaluecookie',{ maxAge: 900000, httpOnly: true });
					//response.setHeader('Myname', 'Joe');
					response.on('data', function(chunk) {
						data += chunk;
					})
					.on('end', function() {
						res.end(data);
					});

				});
				return false;
			} else {
				// redirect
				req.url = req.url.replace(rule.from, rule.to);
				return true;
			}

        }
    };
};

utils.rewriteRequest = function (req, res, next) {
    if (rules.length) {
        rules.some(utils.dispatcher(req, res));
    }
    //next();
};
