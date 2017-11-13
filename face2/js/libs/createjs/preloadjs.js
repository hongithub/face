
//##############################################################################
// XHRRequest.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

// constructor
	/**
	 * A preloader that loads items using XHR requests, usually XMLHttpRequest. However XDomainRequests will be used
	 * for cross-domain requests if possible, and older versions of IE fall back on to ActiveX objects when necessary.
	 * XHR requests load the content as text or binary data, provide progress and consistent completion events, and
	 * can be canceled during load. Note that XHR is not supported in IE 6 or earlier, and is not recommended for
	 * cross-domain loading.
	 * @class XHRRequest
	 * @constructor
	 * @param {Object} item The object that defines the file to load. Please see the {{#crossLink "LoadQueue/loadFile"}}{{/crossLink}}
	 * for an overview of supported file properties.
	 * @extends AbstractLoader
	 */
	function XHRRequest (item) {
		this.AbstractRequest_constructor(item);

		// protected properties
		/**
		 * A reference to the XHR request used to load the content.
		 * @property _request
		 * @type {XMLHttpRequest | XDomainRequest | ActiveX.XMLHTTP}
		 * @private
		 */
		this._request = null;

		/**
		 * A manual load timeout that is used for browsers that do not support the onTimeout event on XHR (XHR level 1,
		 * typically IE9).
		 * @property _loadTimeout
		 * @type {Number}
		 * @private
		 */
		this._loadTimeout = null;

		/**
		 * The browser's XHR (XMLHTTPRequest) version. Supported versions are 1 and 2. There is no official way to detect
		 * the version, so we use capabilities to make a best guess.
		 * @property _xhrLevel
		 * @type {Number}
		 * @default 1
		 * @private
		 */
		this._xhrLevel = 1;

		/**
		 * The response of a loaded file. This is set because it is expensive to look up constantly. This property will be
		 * null until the file is loaded.
		 * @property _response
		 * @type {mixed}
		 * @private
		 */
		this._response = null;

		/**
		 * The response of the loaded file before it is modified. In most cases, content is converted from raw text to
		 * an HTML tag or a formatted object which is set to the <code>result</code> property, but the developer may still
		 * want to access the raw content as it was loaded.
		 * @property _rawResponse
		 * @type {String|Object}
		 * @private
		 */
		this._rawResponse = null;

		this._canceled = false;

		// Setup our event handlers now.
		this._handleLoadStartProxy = createjs.proxy(this._handleLoadStart, this);
		this._handleProgressProxy = createjs.proxy(this._handleProgress, this);
		this._handleAbortProxy = createjs.proxy(this._handleAbort, this);
		this._handleErrorProxy = createjs.proxy(this._handleError, this);
		this._handleTimeoutProxy = createjs.proxy(this._handleTimeout, this);
		this._handleLoadProxy = createjs.proxy(this._handleLoad, this);
		this._handleReadyStateChangeProxy = createjs.proxy(this._handleReadyStateChange, this);

		if (!this._createXHR(item)) {
			//TODO: Throw error?
		}
	};

	var p = createjs.extend(XHRRequest, createjs.AbstractRequest);

// static properties
	/**
	 * A list of XMLHTTP object IDs to try when building an ActiveX object for XHR requests in earlier versions of IE.
	 * @property ACTIVEX_VERSIONS
	 * @type {Array}
	 * @since 0.4.2
	 * @private
	 */
	XHRRequest.ACTIVEX_VERSIONS = [
		"Msxml2.XMLHTTP.6.0",
		"Msxml2.XMLHTTP.5.0",
		"Msxml2.XMLHTTP.4.0",
		"MSXML2.XMLHTTP.3.0",
		"MSXML2.XMLHTTP",
		"Microsoft.XMLHTTP"
	];

// Public methods
	/**
	 * Look up the loaded result.
	 * @method getResult
	 * @param {Boolean} [raw=false] Return a raw result instead of a formatted result. This applies to content
	 * loaded via XHR such as scripts, XML, CSS, and Images. If there is no raw result, the formatted result will be
	 * returned instead.
	 * @return {Object} A result object containing the content that was loaded, such as:
	 * <ul>
	 *      <li>An image tag (&lt;image /&gt;) for images</li>
	 *      <li>A script tag for JavaScript (&lt;script /&gt;). Note that scripts loaded with tags may be added to the
	 *      HTML head.</li>
	 *      <li>A style tag for CSS (&lt;style /&gt;)</li>
	 *      <li>Raw text for TEXT</li>
	 *      <li>A formatted JavaScript object defined by JSON</li>
	 *      <li>An XML document</li>
	 *      <li>An binary arraybuffer loaded by XHR</li>
	 * </ul>
	 * Note that if a raw result is requested, but not found, the result will be returned instead.
	 */
	p.getResult = function (raw) {
		if (raw && this._rawResponse) {
			return this._rawResponse;
		}
		return this._response;
	};

	// Overrides abstract method in AbstractRequest
	p.cancel = function () {
		this.canceled = true;
		this._clean();
		this._request.abort();
	};

	// Overrides abstract method in AbstractLoader
	p.load = function () {
		if (this._request == null) {
			this._handleError();
			return;
		}

		//Events
		if (this._request.addEventListener != null) {
			this._request.addEventListener("loadstart", this._handleLoadStartProxy, false);
			this._request.addEventListener("progress", this._handleProgressProxy, false);
			this._request.addEventListener("abort", this._handleAbortProxy, false);
			this._request.addEventListener("error", this._handleErrorProxy, false);
			this._request.addEventListener("timeout", this._handleTimeoutProxy, false);

			// Note: We don't get onload in all browsers (earlier FF and IE). onReadyStateChange handles these.
			this._request.addEventListener("load", this._handleLoadProxy, false);
			this._request.addEventListener("readystatechange", this._handleReadyStateChangeProxy, false);
		} else {
			// IE9 support
			this._request.onloadstart = this._handleLoadStartProxy;
			this._request.onprogress = this._handleProgressProxy;
			this._request.onabort = this._handleAbortProxy;
			this._request.onerror = this._handleErrorProxy;
			this._request.ontimeout = this._handleTimeoutProxy;

			// Note: We don't get onload in all browsers (earlier FF and IE). onReadyStateChange handles these.
			this._request.onload = this._handleLoadProxy;
			this._request.onreadystatechange = this._handleReadyStateChangeProxy;
		}

		// Set up a timeout if we don't have XHR2
		if (this._xhrLevel == 1) {
			this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);
		}

		// Sometimes we get back 404s immediately, particularly when there is a cross origin request.  // note this does not catch in Chrome
		try {
			if (!this._item.values) {
				this._request.send();
			} else {
				this._request.send(createjs.URLUtils.formatQueryString(this._item.values));
			}
		} catch (error) {
			this.dispatchEvent(new createjs.ErrorEvent("XHR_SEND", null, error));
		}
	};

	p.setResponseType = function (type) {
		// Some old browsers doesn't support blob, so we convert arraybuffer to blob after response is downloaded
		if (type === 'blob') {
			type = window.URL ? 'blob' : 'arraybuffer';
			this._responseType = type;
		}
		this._request.responseType = type;
	};

	/**
	 * Get all the response headers from the XmlHttpRequest.
	 *
	 * <strong>From the docs:</strong> Return all the HTTP headers, excluding headers that are a case-insensitive match
	 * for Set-Cookie or Set-Cookie2, as a single string, with each header line separated by a U+000D CR U+000A LF pair,
	 * excluding the status line, and with each header name and header value separated by a U+003A COLON U+0020 SPACE
	 * pair.
	 * @method getAllResponseHeaders
	 * @return {String}
	 * @since 0.4.1
	 */
	p.getAllResponseHeaders = function () {
		if (this._request.getAllResponseHeaders instanceof Function) {
			return this._request.getAllResponseHeaders();
		} else {
			return null;
		}
	};

	/**
	 * Get a specific response header from the XmlHttpRequest.
	 *
	 * <strong>From the docs:</strong> Returns the header field value from the response of which the field name matches
	 * header, unless the field name is Set-Cookie or Set-Cookie2.
	 * @method getResponseHeader
	 * @param {String} header The header name to retrieve.
	 * @return {String}
	 * @since 0.4.1
	 */
	p.getResponseHeader = function (header) {
		if (this._request.getResponseHeader instanceof Function) {
			return this._request.getResponseHeader(header);
		} else {
			return null;
		}
	};

// protected methods
	/**
	 * The XHR request has reported progress.
	 * @method _handleProgress
	 * @param {Object} event The XHR progress event.
	 * @private
	 */
	p._handleProgress = function (event) {
		if (!event || event.loaded > 0 && event.total == 0) {
			return; // Sometimes we get no "total", so just ignore the progress event.
		}

		var newEvent = new createjs.ProgressEvent(event.loaded, event.total);
		this.dispatchEvent(newEvent);
	};

	/**
	 * The XHR request has reported a load start.
	 * @method _handleLoadStart
	 * @param {Object} event The XHR loadStart event.
	 * @private
	 */
	p._handleLoadStart = function (event) {
		clearTimeout(this._loadTimeout);
		this.dispatchEvent("loadstart");
	};

	/**
	 * The XHR request has reported an abort event.
	 * @method handleAbort
	 * @param {Object} event The XHR abort event.
	 * @private
	 */
	p._handleAbort = function (event) {
		this._clean();
		this.dispatchEvent(new createjs.ErrorEvent("XHR_ABORTED", null, event));
	};

	/**
	 * The XHR request has reported an error event.
	 * @method _handleError
	 * @param {Object} event The XHR error event.
	 * @private
	 */
	p._handleError = function (event) {
		this._clean();
		this.dispatchEvent(new createjs.ErrorEvent(event.message));
	};

	/**
	 * The XHR request has reported a readyState change. Note that older browsers (IE 7 & 8) do not provide an onload
	 * event, so we must monitor the readyStateChange to determine if the file is loaded.
	 * @method _handleReadyStateChange
	 * @param {Object} event The XHR readyStateChange event.
	 * @private
	 */
	p._handleReadyStateChange = function (event) {
		if (this._request.readyState == 4) {
			this._handleLoad();
		}
	};

	/**
	 * The XHR request has completed. This is called by the XHR request directly, or by a readyStateChange that has
	 * <code>request.readyState == 4</code>. Only the first call to this method will be processed.
	 *
	 * Note that This method uses {{#crossLink "_checkError"}}{{/crossLink}} to determine if the server has returned an
	 * error code.
	 * @method _handleLoad
	 * @param {Object} event The XHR load event.
	 * @private
	 */
	p._handleLoad = function (event) {
		if (this.loaded) {
			return;
		}
		this.loaded = true;

		var error = this._checkError();
		if (error) {
			this._handleError(error);
			return;
		}

		this._response = this._getResponse();
		// Convert arraybuffer back to blob
		if (this._responseType === 'arraybuffer') {
			try {
				this._response = new Blob([this._response]);
			} catch (e) {
				// Fallback to use BlobBuilder if Blob constructor is not supported
				// Tested on Android 2.3 ~ 4.2 and iOS5 safari
				window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
				if (e.name === 'TypeError' && window.BlobBuilder) {
					var builder = new BlobBuilder();
					builder.append(this._response);
					this._response = builder.getBlob();
				}
			}
		}
		this._clean();

		this.dispatchEvent(new createjs.Event("complete"));
	};

	/**
	 * The XHR request has timed out. This is called by the XHR request directly, or via a <code>setTimeout</code>
	 * callback.
	 * @method _handleTimeout
	 * @param {Object} [event] The XHR timeout event. This is occasionally null when called by the backup setTimeout.
	 * @private
	 */
	p._handleTimeout = function (event) {
		this._clean();
		this.dispatchEvent(new createjs.ErrorEvent("PRELOAD_TIMEOUT", null, event));
	};

// Protected
	/**
	 * Determine if there is an error in the current load.
	 * Currently this checks the status of the request for problem codes, and not actual response content:
	 * <ul>
	 *     <li>Status codes between 400 and 599 (HTTP error range)</li>
	 *     <li>A status of 0, but *only when the application is running on a server*. If the application is running
	 *     on `file:`, then it may incorrectly treat an error on local (or embedded applications) as a successful
	 *     load.</li>
	 * </ul>
	 * @method _checkError
	 * @return {Error} An error with the status code in the `message` argument.
	 * @private
	 */
	p._checkError = function () {
		var status = parseInt(this._request.status);
		if (status >= 400 && status <= 599) {
			return new Error(status);
		} else if (status == 0) {
			if ((/^https?:/).test(location.protocol)) { return new Error(0); }
			return null; // Likely an embedded app.
		} else {
			return null;
		}
	};


	/**
	 * Validate the response. Different browsers have different approaches, some of which throw errors when accessed
	 * in other browsers. If there is no response, the <code>_response</code> property will remain null.
	 * @method _getResponse
	 * @private
	 */
	p._getResponse = function () {
		if (this._response != null) {
			return this._response;
		}

		if (this._request.response != null) {
			return this._request.response;
		}

		// Android 2.2 uses .responseText
		try {
			if (this._request.responseText != null) {
				return this._request.responseText;
			}
		} catch (e) {
		}

		// When loading XML, IE9 does not return .response, instead it returns responseXML.xml
		try {
			if (this._request.responseXML != null) {
				return this._request.responseXML;
			}
		} catch (e) {
		}

		return null;
	};

	/**
	 * Create an XHR request. Depending on a number of factors, we get totally different results.
	 * <ol><li>Some browsers get an <code>XDomainRequest</code> when loading cross-domain.</li>
	 *      <li>XMLHttpRequest are created when available.</li>
	 *      <li>ActiveX.XMLHTTP objects are used in older IE browsers.</li>
	 *      <li>Text requests override the mime type if possible</li>
	 *      <li>Origin headers are sent for crossdomain requests in some browsers.</li>
	 *      <li>Binary loads set the response type to "arraybuffer"</li></ol>
	 * @method _createXHR
	 * @param {Object} item The requested item that is being loaded.
	 * @return {Boolean} If an XHR request or equivalent was successfully created.
	 * @private
	 */
	p._createXHR = function (item) {
		// Check for cross-domain loads. We can't fully support them, but we can try.
		var crossdomain = createjs.URLUtils.isCrossDomain(item);
		var headers = {};

		// Create the request. Fallback to whatever support we have.
		var req = null;
		if (window.XMLHttpRequest) {
			req = new XMLHttpRequest();
			// This is 8 or 9, so use XDomainRequest instead.
			if (crossdomain && req.withCredentials === undefined && window.XDomainRequest) {
				req = new XDomainRequest();
			}
		} else { // Old IE versions use a different approach
			for (var i = 0, l = s.ACTIVEX_VERSIONS.length; i < l; i++) {
				var axVersion = s.ACTIVEX_VERSIONS[i];
				try {
					req = new ActiveXObject(axVersion);
					break;
				} catch (e) {
				}
			}
			if (req == null) {
				return false;
			}
		}

		// Default to utf-8 for Text requests.
		if (item.mimeType == null && createjs.RequestUtils.isText(item.type)) {
			item.mimeType = "text/plain; charset=utf-8";
		}

		// IE9 doesn't support overrideMimeType(), so we need to check for it.
		if (item.mimeType && req.overrideMimeType) {
			req.overrideMimeType(item.mimeType);
		}

		// Determine the XHR level
		this._xhrLevel = (typeof req.responseType === "string") ? 2 : 1;

		var src = null;
		if (item.method == createjs.Methods.GET) {
			src = createjs.URLUtils.buildURI(item.src, item.values);
		} else {
			src = item.src;
		}

		// Open the request.  Set cross-domain flags if it is supported (XHR level 1 only)
		req.open(item.method || createjs.Methods.GET, src, true);

		if (crossdomain && req instanceof XMLHttpRequest && this._xhrLevel == 1) {
			headers["Origin"] = location.origin;
		}

		// To send data we need to set the Content-type header)
		if (item.values && item.method == createjs.Methods.POST) {
			headers["Content-Type"] = "application/x-www-form-urlencoded";
		}

		if (!crossdomain && !headers["X-Requested-With"]) {
			headers["X-Requested-With"] = "XMLHttpRequest";
		}

		if (item.headers) {
			for (var n in item.headers) {
				headers[n] = item.headers[n];
			}
		}

		for (n in headers) {
			req.setRequestHeader(n, headers[n])
		}

		if (req instanceof XMLHttpRequest && item.withCredentials !== undefined) {
			req.withCredentials = item.withCredentials;
		}

		this._request = req;

		return true;
	};

	/**
	 * A request has completed (or failed or canceled), and needs to be disposed.
	 * @method _clean
	 * @private
	 */
	p._clean = function () {
		clearTimeout(this._loadTimeout);

		if (this._request.removeEventListener != null) {
			this._request.removeEventListener("loadstart", this._handleLoadStartProxy);
			this._request.removeEventListener("progress", this._handleProgressProxy);
			this._request.removeEventListener("abort", this._handleAbortProxy);
			this._request.removeEventListener("error", this._handleErrorProxy);
			this._request.removeEventListener("timeout", this._handleTimeoutProxy);
			this._request.removeEventListener("load", this._handleLoadProxy);
			this._request.removeEventListener("readystatechange", this._handleReadyStateChangeProxy);
		} else {
			this._request.onloadstart = null;
			this._request.onprogress = null;
			this._request.onabort = null;
			this._request.onerror = null;
			this._request.ontimeout = null;
			this._request.onload = null;
			this._request.onreadystatechange = null;
		}
	};

	p.toString = function () {
		return "[PreloadJS XHRRequest]";
	};

	createjs.XHRRequest = createjs.promote(XHRRequest, "AbstractRequest");

}());






//##############################################################################
// CSSLoader.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for CSS files.
	 * @class CSSLoader
	 * @param {LoadItem|Object} loadItem
	 * @param {Boolean} preferXHR
	 * @extends AbstractLoader
	 * @constructor
	 */
	function CSSLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.CSS);

		// public properties
		this.resultFormatter = this._formatResult;

		// protected properties
		this._tagSrcAttribute = "href";

		if (preferXHR) {
			this._tag = createjs.Elements.style();
		} else {
			this._tag = createjs.Elements.link();
		}

		this._tag.rel = "stylesheet";
		this._tag.type = "text/css";
	};

	var p = createjs.extend(CSSLoader, createjs.AbstractLoader);
	var s = CSSLoader;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/CSS:property"}}{{/crossLink}}.
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.CSS;
	};

	// protected methods
	/**
	 * The result formatter for CSS files.
	 * @method _formatResult
	 * @param {AbstractLoader} loader
	 * @returns {HTMLLinkElement|HTMLStyleElement}
	 * @private
	 */
	p._formatResult = function (loader) {
		if (this._preferXHR) {
			var tag = loader.getTag();

			if (tag.styleSheet) { // IE
				tag.styleSheet.cssText = loader.getResult(true);
			} else {
				var textNode = createjs.Elements.text(loader.getResult(true));
				tag.appendChild(textNode);
			}
		} else {
			tag = this._tag;
		}

		createjs.DomUtils.appendToHead(tag);

		return tag;
	};

	createjs.CSSLoader = createjs.promote(CSSLoader, "AbstractLoader");

}());



//##############################################################################
// ImageLoader.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for image files.
	 * @class ImageLoader
	 * @param {LoadItem|Object} loadItem
	 * @param {Boolean} preferXHR
	 * @extends AbstractLoader
	 * @constructor
	 */
	function ImageLoader (loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.IMAGE);

		// public properties
		this.resultFormatter = this._formatResult;

		// protected properties
		this._tagSrcAttribute = "src";

		// Check if the preload item is already a tag.
		if (createjs.DomUtils.isImageTag(loadItem)) {
			this._tag = loadItem;
		} else if (createjs.DomUtils.isImageTag(loadItem.src)) {
			this._tag = loadItem.src;
		} else if (createjs.DomUtils.isImageTag(loadItem.tag)) {
			this._tag = loadItem.tag;
		}

		if (this._tag != null) {
			this._preferXHR = false;
		} else {
			this._tag = createjs.Elements.img();
		}

		this.on("initialize", this._updateXHR, this);
	};

	var p = createjs.extend(ImageLoader, createjs.AbstractLoader);
	var s = ImageLoader;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/IMAGE:property"}}{{/crossLink}}.
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.IMAGE;
	};

	// public methods
	p.load = function () {
		if (this._tag.src != "" && this._tag.complete) {
			this._sendComplete();
			return;
		}

		var crossOrigin = this._item.crossOrigin;
		if (crossOrigin == true) { crossOrigin = "Anonymous"; }
		if (crossOrigin != null && !createjs.URLUtils.isLocal(this._item)) {
			this._tag.crossOrigin = crossOrigin;
		}

		this.AbstractLoader_load();
	};

	// protected methods
	/**
	 * Before the item loads, set its mimeType and responseType.
	 * @property _updateXHR
	 * @param {Event} event
	 * @private
	 */
	p._updateXHR = function (event) {
		event.loader.mimeType = 'text/plain; charset=x-user-defined-binary';

		// Only exists for XHR
		if (event.loader.setResponseType) {
			event.loader.setResponseType("blob");
		}
	};

	/**
	 * The result formatter for Image files.
	 * @method _formatResult
	 * @param {AbstractLoader} loader
	 * @returns {HTMLImageElement}
	 * @private
	 */
	p._formatResult = function (loader) {
		return this._formatImage;
	};

	/**
	 * The asynchronous image formatter function. This is required because images have
	 * a short delay before they are ready.
	 * @method _formatImage
	 * @param {Function} successCallback The method to call when the result has finished formatting
	 * @param {Function} errorCallback The method to call if an error occurs during formatting
	 * @private
	 */
	p._formatImage = function (successCallback, errorCallback) {
		var tag = this._tag;
		var URL = window.URL || window.webkitURL;

		if (!this._preferXHR) {

			//document.body.removeChild(tag);
		} else if (URL) {
			var objURL = URL.createObjectURL(this.getResult(true));
			tag.src = objURL;

			tag.addEventListener("load", this._cleanUpURL, false);
			tag.addEventListener("error", this._cleanUpURL, false);
		} else {
			tag.src = this._item.src;
		}

		if (tag.complete) {
			successCallback(tag);
		} else {
            tag.onload = createjs.proxy(function() {
                successCallback(this._tag);
                tag.onload = tag.onerror = null;
            }, this);

            tag.onerror = createjs.proxy(function(event) {
                errorCallback(new createjs.ErrorEvent('IMAGE_FORMAT', null, event));
                tag.onload = tag.onerror = null;
            }, this);
		}
	};

	/**
	 * Clean up the ObjectURL, the tag is done with it. Note that this function is run
	 * as an event listener without a proxy/closure, as it doesn't require it - so do not
	 * include any functionality that requires scope without changing it.
	 * @method _cleanUpURL
	 * @param event
	 * @private
	 */
	p._cleanUpURL = function (event) {
		var URL = window.URL || window.webkitURL;
		URL.revokeObjectURL(event.target.src);
	};

	createjs.ImageLoader = createjs.promote(ImageLoader, "AbstractLoader");

}());

//##############################################################################
// JavaScriptLoader.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for JavaScript files.
	 * @class JavaScriptLoader
	 * @param {LoadItem|Object} loadItem
	 * @param {Boolean} preferXHR
	 * @extends AbstractLoader
	 * @constructor
	 */
	function JavaScriptLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.JAVASCRIPT);

		// public properties
		this.resultFormatter = this._formatResult;

		// protected properties
		this._tagSrcAttribute = "src";
		this.setTag(createjs.Elements.script());
	};

	var p = createjs.extend(JavaScriptLoader, createjs.AbstractLoader);
	var s = JavaScriptLoader;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/JAVASCRIPT:property"}}{{/crossLink}}
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.JAVASCRIPT;
	};

	// protected methods
	/**
	 * The result formatter for JavaScript files.
	 * @method _formatResult
	 * @param {AbstractLoader} loader
	 * @returns {HTMLLinkElement|HTMLStyleElement}
	 * @private
	 */
	p._formatResult = function (loader) {
		var tag = loader.getTag();
		if (this._preferXHR) {
			tag.text = loader.getResult(true);
		}
		return tag;
	};

	createjs.JavaScriptLoader = createjs.promote(JavaScriptLoader, "AbstractLoader");

}());

//##############################################################################
// JSONLoader.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for JSON files. To load JSON cross-domain, use JSONP and the {{#crossLink "JSONPLoader"}}{{/crossLink}}
	 * instead. To load JSON-formatted manifests, use {{#crossLink "ManifestLoader"}}{{/crossLink}}, and to
	 * load EaselJS SpriteSheets, use {{#crossLink "SpriteSheetLoader"}}{{/crossLink}}.
	 * @class JSONLoader
	 * @param {LoadItem|Object} loadItem
	 * @extends AbstractLoader
	 * @constructor
	 */
	function JSONLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, true, createjs.Types.JSON);

		// public properties
		this.resultFormatter = this._formatResult;
	};

	var p = createjs.extend(JSONLoader, createjs.AbstractLoader);
	var s = JSONLoader;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/JSON:property"}}{{/crossLink}}.
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.JSON;
	};

	// protected methods
	/**
	 * The result formatter for JSON files.
	 * @method _formatResult
	 * @param {AbstractLoader} loader
	 * @returns {HTMLLinkElement|HTMLStyleElement}
	 * @private
	 */
	p._formatResult = function (loader) {
		var json = null;
		try {
			json = createjs.DataUtils.parseJSON(loader.getResult(true));
		} catch (e) {
			var event = new createjs.ErrorEvent("JSON_FORMAT", null, e);
			this._sendError(event);
			return e;
		}

		return json;
	};

	createjs.JSONLoader = createjs.promote(JSONLoader, "AbstractLoader");

}());

//##############################################################################
// JSONPLoader.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for JSONP files, which are JSON-formatted text files, wrapped in a callback. To load regular JSON
	 * without a callback use the {{#crossLink "JSONLoader"}}{{/crossLink}} instead. To load JSON-formatted manifests,
	 * use {{#crossLink "ManifestLoader"}}{{/crossLink}}, and to load EaselJS SpriteSheets, use
	 * {{#crossLink "SpriteSheetLoader"}}{{/crossLink}}.
	 *
	 * JSONP is a format that provides a solution for loading JSON files cross-domain <em>without</em> requiring CORS.
	 * JSONP files are loaded as JavaScript, and the "callback" is executed once they are loaded. The callback in the
	 * JSONP must match the callback passed to the loadItem.
	 *
	 * <h4>Example JSONP</h4>
	 *
	 * 		callbackName({
	 * 			"name": "value",
	 *	 		"num": 3,
	 *			"obj": { "bool":true }
	 * 		});
	 *
	 * <h4>Example</h4>
	 *
	 * 		var loadItem = {id:"json", type:"jsonp", src:"http://server.com/text.json", callback:"callbackName"}
	 * 		var queue = new createjs.LoadQueue();
	 * 		queue.on("complete", handleComplete);
	 * 		queue.loadItem(loadItem);
	 *
	 * 		function handleComplete(event) }
	 * 			var json = queue.getResult("json");
	 * 			console.log(json.obj.bool); // true
	 * 		}
	 *
	 * JSONP files loaded concurrently require a <em>unique</em> callback. To ensure JSONP files are loaded in order,
	 * either use the {{#crossLink "LoadQueue/setMaxConnections"}}{{/crossLink}} method (set to 1), or set
	 * {{#crossLink "LoadItem/maintainOrder:property"}}{{/crossLink}} on items with the same callback.
	 *
	 * Important note: Some browsers will prevent JSONP from firing the callback if the file was loaded as JSON, and not
	 * JavaScript. You may have to have your server give you a JavaScript mime-type for this to work.
	 *
	 * @class JSONPLoader
	 * @param {LoadItem|Object} loadItem
	 * @extends AbstractLoader
	 * @constructor
	 */
	function JSONPLoader(loadItem) {
		this.AbstractLoader_constructor(loadItem, false, createjs.Types.JSONP);
		this.setTag(createjs.Elements.script());
		this.getTag().type = "text/javascript";
	};

	var p = createjs.extend(JSONPLoader, createjs.AbstractLoader);
	var s = JSONPLoader;


	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/JSONP:property"}}{{/crossLink}}.
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.JSONP;
	};

	// public methods
	p.cancel = function () {
		this.AbstractLoader_cancel();
		this._dispose();
	};

	/**
	 * Loads the JSONp file.  Because of the unique loading needs of JSONp
	 * we don't use the AbstractLoader.load() method.
	 *
	 * @method load
	 *
	 */
	p.load = function () {
		if (this._item.callback == null) {
			throw new Error('callback is required for loading JSONP requests.');
		}

		// TODO: Look into creating our own iFrame to handle the load
		// In the first attempt, FF did not get the result
		//   result instanceof Object did not work either
		//   so we would need to clone the result.
		if (window[this._item.callback] != null) {
			throw new Error(
				"JSONP callback '" +
				this._item.callback +
				"' already exists on window. You need to specify a different callback or re-name the current one.");
		}

		window[this._item.callback] = createjs.proxy(this._handleLoad, this);
		createjs.DomUtils.appendToBody(this._tag);

		this._loadTimeout = setTimeout(createjs.proxy(this._handleTimeout, this), this._item.loadTimeout);

		// Load the tag
		this._tag.src = this._item.src;
	};

	// private methods
	/**
	 * Handle the JSONP callback, which is a public method defined on `window`.
	 * @method _handleLoad
	 * @param {Object} data The formatted JSON data.
	 * @private
	 */
	p._handleLoad = function (data) {
		this._result = this._rawResult = data;
		this._sendComplete();

		this._dispose();
	};

	/**
	 * The tag request has not loaded within the time specfied in loadTimeout.
	 * @method _handleError
	 * @param {Object} event The XHR error event.
	 * @private
	 */
	p._handleTimeout = function () {
		this._dispose();
		this.dispatchEvent(new createjs.ErrorEvent("timeout"));
	};

	/**
	 * Clean up the JSONP load. This clears out the callback and script tag that this loader creates.
	 * @method _dispose
	 * @private
	 */
	p._dispose = function () {
		createjs.DomUtils.removeChild(this._tag);
		delete window[this._item.callback];

		clearTimeout(this._loadTimeout);
	};

	createjs.JSONPLoader = createjs.promote(JSONPLoader, "AbstractLoader");

}());






//##############################################################################
// SpriteSheetLoader.js
//##############################################################################

this.createjs = this.createjs || {};

(function () {
	"use strict";

	// constructor
	/**
	 * A loader for EaselJS SpriteSheets. Images inside the spritesheet definition are loaded before the loader
	 * completes. To load SpriteSheets using JSONP, specify a {{#crossLink "LoadItem/callback:property"}}{{/crossLink}}
	 * as part of the {{#crossLink "LoadItem"}}{{/crossLink}}. Note that the {{#crossLink "JSONLoader"}}{{/crossLink}}
	 * and {{#crossLink "JSONPLoader"}}{{/crossLink}} are higher priority loaders, so SpriteSheets <strong>must</strong>
	 * set the {{#crossLink "LoadItem"}}{{/crossLink}} {{#crossLink "LoadItem/type:property"}}{{/crossLink}} property
	 * to {{#crossLink "Types/SPRITESHEET:property"}}{{/crossLink}}.
	 *
	 * The {{#crossLink "LoadItem"}}{{/crossLink}} {{#crossLink "LoadItem/crossOrigin:property"}}{{/crossLink}} as well
	 * as the {{#crossLink "LoadQueue's"}}{{/crossLink}} `basePath` argument and {{#crossLink "LoadQueue/_preferXHR"}}{{/crossLink}}
	 * property supplied to the {{#crossLink "LoadQueue"}}{{/crossLink}} are passed on to the sub-manifest that loads
	 * the SpriteSheet images.
	 *
	 * Note that the SpriteSheet JSON does not respect the {{#crossLink "LoadQueue/_preferXHR:property"}}{{/crossLink}}
	 * property, which should instead be determined by the presence of a {{#crossLink "LoadItem/callback:property"}}{{/crossLink}}
	 * property on the SpriteSheet load item. This is because the JSON loaded will have a different format depending on
	 * if it is loaded as JSON, so just changing `preferXHR` is not enough to change how it is loaded.
	 * @class SpriteSheetLoader
	 * @param {LoadItem|Object} loadItem
	 * @extends AbstractLoader
	 * @constructor
	 */
	function SpriteSheetLoader(loadItem, preferXHR) {
		this.AbstractLoader_constructor(loadItem, preferXHR, createjs.Types.SPRITESHEET);

		// protected properties
		/**
		 * An internal queue which loads the SpriteSheet's images.
		 * @method _manifestQueue
		 * @type {LoadQueue}
		 * @private
		 */
		this._manifestQueue = null;
	}

	var p = createjs.extend(SpriteSheetLoader, createjs.AbstractLoader);
	var s = SpriteSheetLoader;

	// static properties
	/**
	 * The amount of progress that the manifest itself takes up.
	 * @property SPRITESHEET_PROGRESS
	 * @type {number}
	 * @default 0.25 (25%)
	 * @private
	 * @static
	 */
	s.SPRITESHEET_PROGRESS = 0.25;

	// static methods
	/**
	 * Determines if the loader can load a specific item. This loader can only load items that are of type
	 * {{#crossLink "Types/SPRITESHEET:property"}}{{/crossLink}}
	 * @method canLoadItem
	 * @param {LoadItem|Object} item The LoadItem that a LoadQueue is trying to load.
	 * @returns {Boolean} Whether the loader can load the item.
	 * @static
	 */
	s.canLoadItem = function (item) {
		return item.type == createjs.Types.SPRITESHEET;
	};

	// public methods
	p.destroy = function() {
		this.AbstractLoader_destroy();
		this._manifestQueue.close();
	};

	// protected methods
	p._createRequest = function() {
		var callback = this._item.callback;
		if (callback != null) {
			this._request = new createjs.JSONPLoader(this._item);
		} else {
			this._request = new createjs.JSONLoader(this._item);
		}
	};

	p.handleEvent = function (event) {
		switch (event.type) {
			case "complete":
				this._rawResult = event.target.getResult(true);
				this._result = event.target.getResult();
				this._sendProgress(s.SPRITESHEET_PROGRESS);
				this._loadManifest(this._result);
				return;
			case "progress":
				event.loaded *= s.SPRITESHEET_PROGRESS;
				this.progress = event.loaded / event.total;
				if (isNaN(this.progress) || this.progress == Infinity) { this.progress = 0; }
				this._sendProgress(event);
				return;
		}
		this.AbstractLoader_handleEvent(event);
	};

	/**
	 * Create and load the images once the SpriteSheet JSON has been loaded.
	 * @method _loadManifest
	 * @param {Object} json
	 * @private
	 */
	p._loadManifest = function (json) {
		if (json && json.images) {
			var queue = this._manifestQueue = new createjs.LoadQueue(this._preferXHR, this._item.path, this._item.crossOrigin);
			queue.on("complete", this._handleManifestComplete, this, true);
			queue.on("fileload", this._handleManifestFileLoad, this);
			queue.on("progress", this._handleManifestProgress, this);
			queue.on("error", this._handleManifestError, this, true);
			queue.loadManifest(json.images);
		}
	};

	/**
	 * An item from the {{#crossLink "_manifestQueue:property"}}{{/crossLink}} has completed.
	 * @method _handleManifestFileLoad
	 * @param {Event} event
	 * @private
	 */
	p._handleManifestFileLoad = function (event) {
		var image = event.result;
		if (image != null) {
			var images = this.getResult().images;
			var pos = images.indexOf(event.item.src);
			images[pos] = image;
		}
	};

	/**
	 * The images have completed loading. This triggers the {{#crossLink "AbstractLoader/complete:event"}}{{/crossLink}}
	 * {{#crossLink "Event"}}{{/crossLink}} from the SpriteSheetLoader.
	 * @method _handleManifestComplete
	 * @param {Event} event
	 * @private
	 */
	p._handleManifestComplete = function (event) {
		this._result = new createjs.SpriteSheet(this._result);
		this._loadedItems = this._manifestQueue.getItems(true);
		this._sendComplete();
	};

	/**
	 * The images {{#crossLink "LoadQueue"}}{{/crossLink}} has reported progress.
	 * @method _handleManifestProgress
	 * @param {ProgressEvent} event
	 * @private
	 */
	p._handleManifestProgress = function (event) {
		this.progress = event.progress * (1 - s.SPRITESHEET_PROGRESS) + s.SPRITESHEET_PROGRESS;
		this._sendProgress(this.progress);
	};

	/**
	 * An image has reported an error.
	 * @method _handleManifestError
	 * @param {ErrorEvent} event
	 * @private
	 */
	p._handleManifestError = function (event) {
		var newEvent = new createjs.Event("fileerror");
		newEvent.item = event.data;
		this.dispatchEvent(newEvent);
	};

	createjs.SpriteSheetLoader = createjs.promote(SpriteSheetLoader, "AbstractLoader");

}());


