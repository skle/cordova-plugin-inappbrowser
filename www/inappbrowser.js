/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

(function () {
    const exec = require('cordova/exec');
    const channel = require('cordova/channel');
    const modulemapper = require('cordova/modulemapper');
    const urlutil = require('cordova/urlutil');

    function InAppBrowser () {
        this.channels = {
            beforeload: channel.create('beforeload'),
            loadstart: channel.create('loadstart'),
            loadstop: channel.create('loadstop'),
            loaderror: channel.create('loaderror'),
            exit: channel.create('exit'),
            customscheme: channel.create('customscheme'),
            message: channel.create('message'),
            download: channel.create('download')
        };
    }

    InAppBrowser.prototype = {
        _eventHandler: function (event) {
            if (event && event.type in this.channels) {
                if (event.type === 'beforeload') {
                    this.channels[event.type].fire(event, this._loadAfterBeforeload);
                } else {
                    this.channels[event.type].fire(event);
                }
            }
        },
        _loadAfterBeforeload: function (strUrl, aHeaders) {
            strUrl = urlutil.makeAbsolute(strUrl);

			if (typeof(aHeaders) == 'object')
			{
				var sHeaders = aHeaders.join(',');
			}
			else
			{
				var sHeaders = '';
			}

            exec(null, null, 'InAppBrowser', 'loadAfterBeforeload', [strUrl, sHeaders]);
        },
        close: function (eventname) {
            exec(null, null, 'InAppBrowser', 'close', []);
        },
        show: function (eventname) {
            exec(null, null, 'InAppBrowser', 'show', []);
        },
        resize: function (iPosX, iPosY, iWidth, iHeight) {
            exec(null, null, 'InAppBrowser', 'resize', [iPosX, iPosY, iWidth, iHeight]);
        },
        hide: function (eventname) {
            exec(null, null, 'InAppBrowser', 'hide', []);
        },
        addEventListener: function (eventname, f) {
            if (eventname in this.channels) {
                this.channels[eventname].subscribe(f);
            }
        },
        removeEventListener: function (eventname, f) {
            if (eventname in this.channels) {
                this.channels[eventname].unsubscribe(f);
            }
        },

        executeScript: function (injectDetails, cb) {
            if (injectDetails.code) {
                exec(cb, null, 'InAppBrowser', 'injectScriptCode', [injectDetails.code, !!cb]);
            } else if (injectDetails.file) {
                exec(cb, null, 'InAppBrowser', 'injectScriptFile', [injectDetails.file, !!cb]);
            } else {
                throw new Error('executeScript requires exactly one of code or file to be specified');
            }
        },

        insertCSS: function (injectDetails, cb) {
            if (injectDetails.code) {
                exec(cb, null, 'InAppBrowser', 'injectStyleCode', [injectDetails.code, !!cb]);
            } else if (injectDetails.file) {
                exec(cb, null, 'InAppBrowser', 'injectStyleFile', [injectDetails.file, !!cb]);
            } else {
                throw new Error('insertCSS requires exactly one of code or file to be specified');
            }
        },

        addDownloadListener: function (success, error) {
            exec(success, error, 'InAppBrowser', 'downloadListener');
        }
    };

    module.exports = function (strUrl, strWindowName, strWindowFeatures, windowHeaders, callbacks) {
        // Don't catch calls that write to existing frames (e.g. named iframes).
        if (window.frames && window.frames[strWindowName]) {
            const origOpenFunc = modulemapper.getOriginalSymbol(window, 'open');
            return origOpenFunc.apply(window, arguments);
        }

        strUrl = urlutil.makeAbsolute(strUrl);
        const iab = new InAppBrowser();

        callbacks = callbacks || {};
        for (const callbackName in callbacks) {
            iab.addEventListener(callbackName, callbacks[callbackName]);
        }

        const cb = function (eventname) {
            iab._eventHandler(eventname);
        };

		var strWindowHeaders = '';

        if (windowHeaders) {
            if (typeof windowHeaders === 'string' || windowHeaders instanceof String) {
                strWindowHeaders = windowHeaders.replace(/@/gi, '@a');
            } else {
                var first = true;
                for (var k in windowHeaders) {
                    if (windowHeaders.hasOwnProperty(k)) {
                        var key = k.replace(/@/gi, '@a').replace(/,/gi, '@c').replace(/=/gi, '@e');
                        var value = windowHeaders[k].toString().replace(/@/gi, '@a').replace(/,/gi, '@c').replace(/=/gi, '@e');
                        if (first) {
                            first = false;
                        } else {
                            strWindowHeaders += ',';
                        }
                        strWindowHeaders += key + '=' + value;
                    }
                }
            }
        }


        strWindowFeatures = strWindowFeatures || '';

        exec(cb, cb, 'InAppBrowser', 'open', [strUrl, strWindowName, strWindowFeatures, strWindowHeaders]);
        return iab;
    };
})();
