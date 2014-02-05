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
    httpProxy = require('http-proxy'),
    path = require('path'),
    querystring = require('querystring'),
    utils = module.exports,
    rules = [];

utils.registerRule = function (rule) {

    if (!rule || !rule.from || !rule.to ||
        !(rule.from = rule.from.trim()) ||
        !(rule.from = rule.from.trim())) {
        return false;
    }

    var ruleItem = {
        from: new RegExp(rule.from),
        to: rule.to
    };

    if (rule.to.indexOf('http://') === 0) {
        var urlObject = url.parse(rule.to);
        ruleItem.proxy = new httpProxy.HttpProxy({
            target: {
                host: urlObject.hostname,
                port: urlObject.port || '',
                https: urlObject.protocol === 'https:'
            }
        });
    }
    rules.push(ruleItem);

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
            if (rule.to.indexOf('require!') === 0) {
                var urlObject = url.parse(req.url);
                // require
                var filepath = urlObject.pathname.replace(rule.from, rule.to).replace('require!', '');
                var realpath = path.join(process.cwd(), filepath);
                var parameters = querystring.parse(urlObject.query);
                if (fs.existsSync(realpath)) {
                    var data = requireUncached(realpath)(parameters);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return true;
                }
            } else if (rule.to.indexOf('http://') === 0 && rule.proxy) {
                // internet url
                rule.proxy.proxyRequest(req, res);
                return true;
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
