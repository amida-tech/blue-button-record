"use strict";
var winston = require('winston');

var logger = new(winston.Logger)({
    "exitOnError": true,
    "transports": [
        new(winston.transports.Console)({
            "colorize": true,
            "timestamp": true,
            "handleExceptions": true
        }),
    ]
});

logger.log = function () {
    var args = Array.prototype.slice.call(arguments);
    args.splice(1, 0, '[BB-RECORD]');
    winston.Logger.prototype.log.apply(this, args);
};

module.exports = logger;
