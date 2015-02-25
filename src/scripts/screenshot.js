
(function () {
"use strict";

    /* Modules & Constants */

    var DEF_ZOOM = 1,
        DEF_QUALITY = 1,
        DEF_DELAY = 100,
        DEF_WIDTH = 1024,
        DEF_HEIGHT = 768,
        DEF_JS_ENABLED = true,
        DEF_IMAGES_ENABLED = true,
        DEF_FORMAT = 'png',
        DEF_HEADERS = {},
        DEF_STYLES = 'default-styles.css';


    /* Common functions */

    function isPhantomJs() {
        return console && console.log;
    }

    function argument(index) {
        return isPhantomJs() ? phantom.args[index] : system.args[index];
    }

    function log(message) {
        if (isPhantomJs()) {
            console.log(message);
        } else {
            system.stdout.write(message);
        }
    }

    function exit(page, e) {
        if (e) {
            log('Error: ' + e);
        }
        if (page) {
            page.close();
        }
        phantom.exit();
    }

    function def(o, d) {
        return ((o === null) || (typeof (o) === "undefined")) ? d : o;
    }

    function parseOptions(base64) {
        var optionsJSON = window.atob(base64);
        log('Script options: ' + optionsJSON);

        return JSON.parse(optionsJSON);
    }

    function readFile(path) {
        var file = null,
            content = null;

        try {
            file = fs.open(path, 'r');
            content = fs.read();
        } catch (e) {
            log(e);
        }

        if (file) {
            file.close();
        }

        return content;
    }


    /* Web page creation */

    function pageViewPortSize(options) {
        return {
            width: def(options.width, DEF_WIDTH),
            height: def(options.height, DEF_HEIGHT)
        };
    }

    function pageSettings(options) {
        return {
            javascriptEnabled: def(options.js, DEF_JS_ENABLED),
            loadImages: def(options.images, DEF_IMAGES_ENABLED),
            userName: options.user,
            password: options.password,
            userAgent: options.agent
        };
    }

    function pageClipRect(options) {
        var cr = options.clipRect;
        return (cr && cr.top && cr.left && cr.width && cr.height) ? cr : null;
    }

    function pageQuality(options) {
        var quality = def(options.quality, DEF_QUALITY);
        return isPhantomJs() ? String(quality * 100) : quality;
    }

    function createPage(options) {
        var page = webpage.create(),
            clipRect = pageClipRect(options);

        page.zoomFactor = def(options.zoom, DEF_ZOOM);
        page.customHeaders = def(options.headers, DEF_HEADERS);
        page.viewportSize = pageViewPortSize(options);
        page.settings = pageSettings(options);
        if (clipRect) {
            page.clipRect = clipRect;
        }

        return page;
    }


    /* Screenshot rendering */

    function renderScreenshotFile(page, options, outputFile, onFinish) {
        var delay = def(options.delay, DEF_DELAY),
            format = def(options.format, DEF_FORMAT),
            quality = pageQuality(options);

        setTimeout(function () {
            try {
                var renderOptions = {
                    onlyViewport: !!options.height,
                    quality: quality,
                    format: format
                };

                page.render(outputFile, renderOptions);

                log('Rendered screenshot: ' + outputFile);
                onFinish(page);
            } catch (e) {
                onFinish(page, e);
            }
        }, delay);
    }

    function captureScreenshot(base64, outputFile, onFinish) {
        try {
            var options = parseOptions(base64),
                page = createPage(options);

            page.open(options.url, function () {
                try {
                    applyDefaultStyles(page);
                    renderScreenshotFile(page, options, outputFile, onFinish);
                } catch (e) {
                    onFinish(page, e);
                }
            });
        } catch (e) {
            onFinish(null, e);
        }
    }

    function applyDefaultStyles(page) {
        // TODO: Path to the default CSS styles is incorrect.
        var defStyles = readFile(DEF_STYLES);
        if (defStyles) {
            addStyles(page, defStyles);
        }
    }

    function addStyles(page, styles) {
        page.evaluate(function(styles) {
            var style = document.createElement('style'),
                content = document.createTextNode(styles),
                head = document.head;

            style.setAttribute('type', 'text/css');
            style.appendChild(content);

            head.insertBefore(style, head.firstChild);
        }, styles);
    }

    /* Fire starter */

    var system = require('system'),
        webpage = require('webpage'),
        fs = require('fs'),
        base64 = argument(0),
        outputFile = argument(1);

    captureScreenshot(base64, outputFile, exit);

})();
