/*
 * @source: https://github.com/validator/validator/blob/main/site/nu-script.js
 *
 * @licstart  The following is the entire license notice for the JavaScript
 * code in this file.
 *
 * Copyright (c) 2005-2007 Henri Sivonen
 * Copyright (c) 2007 Simon Pieters
 * Copyright (c) 2007-2018 Mozilla Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * @licend  The above is the entire license notice for the JavaScript code
 * in this file.
 *
 */
var idCount = 0
var urlInput = null
var multiUrlInput = null
var multiUrlModeInput = null
var fileInput = null
var textarea = null
var textareaHidden = null
var dynamicStyle = null
var prevHash = null
var hasTextContent = (createHtmlElement('code').textContent != undefined)

var linePattern = /^#l-?[0-9]+$/
var rangePattern = /^#l-?[0-9]+c[0-9]+$/
var exactPattern = /^#cl-?[0-9]+c[0-9]+$/
var htmlBoilerplate = '<!DOCTYPE html>\n<html lang="">\n<head>\n'
	+ '<title>Test</title>\n</head>\n<body>\n<p></p>\n</body>\n</html>'

function boot() {
	installHandlers()
}

function reboot() {
	boot()
	initFieldHolders()
	initUserAgents()
	initWarningsOnly()
	initShowDuplicates()
	installDynamicStyle()
	updateFragmentIdHilite()
	window.setInterval(emulateHashChanged, 50)
	replaceYearWarning()
	initFilters()
	injectHyperlinks()
	moveLangAndDirWarningsAndAddLinks()
	replaceSuccessFailure()
	hideSourceIfNotRequested()
	initLocalProxyInput()
}

function installDynamicStyle() {
	dynamicStyle = createHtmlElement('style')
	document.documentElement.firstChild.appendChild(dynamicStyle)
}

function installHandlers() {
	if (document.forms && document.forms.length) {
		document.forms[0].onsubmit = formSubmission
	}
}

function initFieldHolders() {
	urlInput = document.getElementById('doc')
	urlInput.setAttribute('aria-labelledby', 'docselect')
	urlInput.setAttribute('required', '')
	urlInput.setAttribute('placeholder', 'Enter the URL for an HTML, CSS, or SVG document')
	textareaHidden = createHtmlElement('input')
	textarea = createHtmlElement('textarea')
	textarea.setAttribute('autofocus', '')
	textarea.setAttribute('tabindex', '0')
	if (textarea && textareaHidden) {
		textareaHidden.type = 'hidden'
		textareaHidden.name = 'content'
		textarea.cols = 72
		textarea.rows = 15
		textarea.id = 'doc'
		textarea.setAttribute('aria-labelledby', 'docselect')
		copySourceIntoTextArea()
		if (textarea.value == '') {
			textarea.value = htmlBoilerplate
			if (supportsLocalStorage() && localStorage["inputWasCss"] == "yes") {
				textarea.value = ""
			}
		}
	}
	fileInput = createHtmlElement('input')
	if (fileInput) {
		fileInput.type = 'file'
		fileInput.id = 'doc'
		fileInput.name = 'file'
		fileInput.setAttribute('aria-labelledby', 'docselect')
		fileInput.setAttribute('required', '')
		fileInput.setAttribute('autofocus', '')
		fileInput.setAttribute('tabindex', '0')
	}
	multiUrlInput = createHtmlElement('textarea')
	if (multiUrlInput) {
		multiUrlInput.id = 'doc'
		multiUrlInput.name = 'doc'
		multiUrlInput.setAttribute('aria-labelledby', 'docselect')
		multiUrlInput.setAttribute('required', '')
		multiUrlInput.setAttribute('autofocus', '')
		multiUrlInput.setAttribute('tabindex', '0')
		multiUrlInput.setAttribute('placeholder', 'Enter URLs (one per line)\nSupports HTTP Basic Auth: https://user:pass@example.com/\nExample: https://preview:P3PIq6AS1ki@dev.butlermfg.com/')
		multiUrlInput.cols = 72
		multiUrlInput.rows = 10
	}
	multiUrlModeInput = createHtmlElement('input')
	if (multiUrlModeInput) {
		multiUrlModeInput.type = 'hidden'
		multiUrlModeInput.name = 'multiurl'
		multiUrlModeInput.value = 'yes'
	}
	var label = document.getElementById("inputlabel");
	var disabledAddressType = label.getAttribute('data-allowed-address-type') === 'none'
	label.removeAttribute("for")
	label.textContent = "Check by"
	var modeSelect = createHtmlElement("select")
	modeSelect.id = 'docselect'
	// Remove "address" option from dropdown
	// var addressOption = createOption('address', '')
	// if (disabledAddressType) {
	// 	addressOption.disabled = true
	// }
	// modeSelect.appendChild(addressOption)
	modeSelect.appendChild(createOption('multi URLs', 'multiurl'))
	modeSelect.appendChild(createOption('file upload', 'file'))
	modeSelect.appendChild(createOption('text input', 'textarea'))
	modeSelect.onchange = function () {
		if (this.value == 'file') {
			installFileUpload()
			location.hash = '#file'
		} else if (this.value == 'textarea') {
			installTextarea()
			location.hash = '#textarea'
		} else if (this.value == 'multiurl') {
			installMultiUrlInput()
			location.hash = '#multiurl'
		} else {
			installUrlInput()
			history.pushState("", document.title, location.pathname);
		}
		if (supportsLocalStorage()) {
			localStorage["lastInputMode"] = this.value
		}
	}
	label.appendChild(modeSelect)
	if (urlInput.className == 'file') {
		installFileUpload()
		location.hash = '#file'
		modeSelect.value = 'file'
	} else
		if (urlInput.className == 'textarea' || disabledAddressType) {
			installTextarea()
			location.hash = '#textarea'
			modeSelect.value = 'textarea'
		}
	document.querySelector('#show_options')
		.addEventListener('click', function (e) {
			toggleExtraOptions()
		}, false)

	// Initialize cookie input functionality
	initCookieInput()

	if (location.hash == '#file') {
		installFileUpload()
		location.hash = '#file'
		modeSelect.value = 'file'
	} else if (location.hash == '#multiurl') {
		installMultiUrlInput()
		location.hash = '#multiurl'
		modeSelect.value = 'multiurl'
	} else {
		if (location.hash == '#textarea' || disabledAddressType) {
			installTextarea()
			location.hash = '#textarea'
			modeSelect.value = 'textarea'
		}
		else {
			if (supportsLocalStorage() && localStorage["lastInputMode"] == 'file') {
				installFileUpload()
				location.hash = '#file'
				modeSelect.value = 'file'
			} else if (supportsLocalStorage() && localStorage["lastInputMode"] == 'multiurl') {
				installMultiUrlInput()
				location.hash = '#multiurl'
				modeSelect.value = 'multiurl'
			} else if (supportsLocalStorage() && localStorage["lastInputMode"] == 'textarea') {
				installTextarea()
				location.hash = '#textarea'
				modeSelect.value = 'textarea'
			} else {
				// Default to multi-URL mode for new users
				installMultiUrlInput()
				location.hash = '#multiurl'
				modeSelect.value = 'multiurl'
			}
		}
	}
}

function toggleExtraOptions() {
	var extraoptions = document.querySelector('.extraoptions'),
		extraoptions_useragent = document.querySelector('input[name=useragent]'),
		extraoptions_acceptlanguage = document.querySelector('input[name=acceptlanguage]')
	if (extraoptions.className.indexOf("unhidden") != -1) {
		extraoptions.className = extraoptions.className.replace(/unhidden/, 'hidden')
		extraoptions_useragent.setAttribute("disabled", "")
		extraoptions_acceptlanguage.setAttribute("disabled", "")
	} else {
		extraoptions.className = extraoptions.className.replace(/hidden/, 'unhidden')
		extraoptions_useragent.removeAttribute("disabled")
		extraoptions_acceptlanguage.removeAttribute("disabled")
	}
}

function initCookieInput() {
	var form = document.forms[0]
	if (!form) return

	// Create cookie checkbox
	var cookieCheckbox = createHtmlElement('input')
	cookieCheckbox.type = 'checkbox'
	cookieCheckbox.id = 'enable-cookie'
	cookieCheckbox.name = 'enable-cookie'

	// Create cookie textarea
	var cookieTextarea = createHtmlElement('textarea')
	cookieTextarea.id = 'cookie-input'
	cookieTextarea.name = 'cookie'
	cookieTextarea.rows = 3
	cookieTextarea.cols = 72
	cookieTextarea.placeholder = 'Enter cookies here (e.g., session_id=abc123; auth_token=xyz789)'
	cookieTextarea.style.display = 'none'

	// Create label
	var cookieLabel = createHtmlElement('label')
	cookieLabel.setAttribute('for', 'enable-cookie')
	cookieLabel.appendChild(cookieCheckbox)
	cookieLabel.appendChild(document.createTextNode(' Enable Custom Cookies (for authentication sites)'))

	// Create container
	var cookieContainer = createHtmlElement('div')
	cookieContainer.id = 'cookie-container'
	cookieContainer.style.marginTop = '10px'
	cookieContainer.style.marginBottom = '10px'
	cookieContainer.appendChild(cookieLabel)
	cookieContainer.appendChild(cookieTextarea)

	// Move the cookie UI to be placed before the inputregion (before id inputregion)
	var inputRegionElement = document.getElementById('inputregion')
	if (inputRegionElement && inputRegionElement.parentNode) {
		inputRegionElement.parentNode.insertBefore(cookieContainer, inputRegionElement)
	}

	// Load saved cookie from localStorage
	if (supportsLocalStorage() && localStorage['customCookie']) {
		cookieTextarea.value = localStorage['customCookie']
	}

	// Load saved checkbox state
	if (supportsLocalStorage() && localStorage['enableCookie'] === 'yes') {
		cookieCheckbox.checked = true
		cookieTextarea.style.display = 'block'
	}

	// Toggle textarea visibility when checkbox changes
	cookieCheckbox.addEventListener('change', function (e) {
		if (e.target.checked) {
			cookieTextarea.style.display = 'block'
			if (supportsLocalStorage()) {
				localStorage['enableCookie'] = 'yes'
			}
		} else {
			cookieTextarea.style.display = 'none'
			if (supportsLocalStorage()) {
				localStorage['enableCookie'] = 'no'
			}
		}
	}, false)

	// Save cookie value to localStorage when changed
	cookieTextarea.addEventListener('input', function (e) {
		if (supportsLocalStorage()) {
			localStorage['customCookie'] = e.target.value
		}
	}, false)
}

var localProxyUrl = null
var localProxyAvailable = false

function initLocalProxyInput() {
	var form = document.forms[0]
	if (!form) return

	// Create proxy checkbox
	var proxyCheckbox = createHtmlElement('input')
	proxyCheckbox.type = 'checkbox'
	proxyCheckbox.id = 'enable-local-proxy'
	proxyCheckbox.name = 'enable-local-proxy'

	// Create proxy config div
	var proxyConfigDiv = createHtmlElement('div')
	proxyConfigDiv.id = 'local-proxy-config'
	proxyConfigDiv.style.display = 'none'
	proxyConfigDiv.style.marginTop = '10px'
	proxyConfigDiv.style.padding = '10px'
	proxyConfigDiv.style.border = '1px solid #ddd'
	proxyConfigDiv.style.borderRadius = '3px'
	proxyConfigDiv.style.backgroundColor = '#f9f9f9'

	// Proxy URL input
	var proxyUrlLabel = createHtmlElement('label')
	proxyUrlLabel.textContent = 'Local Proxy URL: '
	proxyUrlLabel.style.display = 'block'
	proxyUrlLabel.style.marginBottom = '5px'
	proxyUrlLabel.style.fontWeight = 'bold'

	var proxyUrlInput = createHtmlElement('input')
	proxyUrlInput.type = 'text'
	proxyUrlInput.id = 'local-proxy-url'
	proxyUrlInput.name = 'local-proxy-url'
	proxyUrlInput.placeholder = 'http://YOUR_LOCAL_IP:3000'
	proxyUrlInput.style.width = '100%'
	proxyUrlInput.style.marginBottom = '10px'

	// Status indicator
	var statusDiv = createHtmlElement('div')
	statusDiv.id = 'proxy-status'
	statusDiv.style.padding = '8px'
	statusDiv.style.marginTop = '10px'
	statusDiv.style.borderRadius = '3px'
	statusDiv.style.fontSize = '0.9em'
	statusDiv.innerHTML = '⏳ Status: Not checked'
	statusDiv.style.backgroundColor = '#f0f0f0'

	// Test connection button
	var testButton = createHtmlElement('button')
	testButton.type = 'button'
	testButton.textContent = 'Test Connection'
	testButton.style.marginTop = '10px'
	testButton.style.padding = '5px 15px'
	testButton.style.cursor = 'pointer'

	// Help text
	var helpText = createHtmlElement('p')
	helpText.style.fontSize = '0.85em'
	helpText.style.color = '#666'
	helpText.style.marginTop = '10px'
	helpText.style.marginBottom = '0'
	helpText.innerHTML = '<strong>Note:</strong> Run local proxy server on your whitelisted machine. ' +
		'Enter your local IP address (e.g., http://192.168.1.100:3000).<br>' +
		'<strong>🔐 HTTP Basic Auth:</strong> URLs with embedded credentials (e.g., https://user:pass@example.com/) are ' +
		'supported both with and without the proxy. The proxy auto-detects and handles credentials.'

	proxyConfigDiv.appendChild(proxyUrlLabel)
	proxyConfigDiv.appendChild(proxyUrlInput)
	proxyConfigDiv.appendChild(testButton)
	proxyConfigDiv.appendChild(statusDiv)
	proxyConfigDiv.appendChild(helpText)

	// Create main label
	var proxyLabel = createHtmlElement('label')
	proxyLabel.setAttribute('for', 'enable-local-proxy')
	proxyLabel.appendChild(proxyCheckbox)
	proxyLabel.appendChild(document.createTextNode(' Use Local Proxy (for IP-restricted / htpasswd sites)'))

	// Create container
	var proxyContainer = createHtmlElement('div')
	proxyContainer.id = 'local-proxy-container'
	proxyContainer.style.marginTop = '10px'
	proxyContainer.style.marginBottom = '10px'
	proxyContainer.appendChild(proxyLabel)
	proxyContainer.appendChild(proxyConfigDiv)

	// Insert before cookie container or inputregion
	var cookieContainer = document.getElementById('cookie-container')
	var inputRegionElement = document.getElementById('inputregion')

	if (cookieContainer && cookieContainer.parentNode) {
		cookieContainer.parentNode.insertBefore(proxyContainer, cookieContainer)
	} else if (inputRegionElement && inputRegionElement.parentNode) {
		inputRegionElement.parentNode.insertBefore(proxyContainer, inputRegionElement)
	}

	// Load saved config from localStorage
	if (supportsLocalStorage()) {
		if (localStorage['localProxyUrl']) {
			proxyUrlInput.value = localStorage['localProxyUrl']
		}
		if (localStorage['enableLocalProxy'] === 'yes') {
			proxyCheckbox.checked = true
			proxyConfigDiv.style.display = 'block'
			// Auto-test connection on load
			setTimeout(function () {
				testProxyConnection(proxyUrlInput.value, statusDiv)
			}, 500)
		}
	}

	// Toggle config visibility
	proxyCheckbox.addEventListener('change', function (e) {
		if (e.target.checked) {
			proxyConfigDiv.style.display = 'block'
			if (supportsLocalStorage()) {
				localStorage['enableLocalProxy'] = 'yes'
			}
		} else {
			proxyConfigDiv.style.display = 'none'
			localProxyAvailable = false
			if (supportsLocalStorage()) {
				localStorage['enableLocalProxy'] = 'no'
			}
		}
	}, false)

	// Save proxy URL
	proxyUrlInput.addEventListener('input', function (e) {
		if (supportsLocalStorage()) {
			localStorage['localProxyUrl'] = e.target.value
		}
		localProxyAvailable = false // Reset status when URL changes
	}, false)

	// Test button handler
	testButton.addEventListener('click', function () {
		var url = proxyUrlInput.value.trim()
		if (!url) {
			updateProxyStatus(statusDiv, 'error', '❌ Please enter proxy URL')
			return
		}
		testProxyConnection(url, statusDiv)
	}, false)
}

function testProxyConnection(proxyUrl, statusDiv) {
	if (!proxyUrl) return

	updateProxyStatus(statusDiv, 'testing', '⏳ Testing connection...')

	// Normalize URL: remove trailing slashes
	var normalizedUrl = proxyUrl.trim().replace(/\/+$/, '')

	var xhr = new XMLHttpRequest()
	xhr.timeout = 5000
	xhr.open('GET', normalizedUrl + '/health', true)

	xhr.onload = function() {
		if (xhr.status === 200) {
			try {
				var response = JSON.parse(xhr.responseText)
				if (response.status === 'ok') {
					localProxyUrl = normalizedUrl
					localProxyAvailable = true
					updateProxyStatus(statusDiv, 'success', '✅ Connected! Proxy is available')
				} else {
					localProxyAvailable = false
					updateProxyStatus(statusDiv, 'error', '❌ Invalid response from proxy')
				}
			} catch (e) {
				localProxyAvailable = false
				updateProxyStatus(statusDiv, 'error', '❌ Invalid response format')
			}
		} else {
			localProxyAvailable = false
			updateProxyStatus(statusDiv, 'error', '❌ Connection failed (HTTP ' + xhr.status + ')')
		}
	}

	xhr.onerror = function () {
		localProxyAvailable = false
		updateProxyStatus(statusDiv, 'error', '❌ Cannot connect to proxy. Make sure it\'s running.')
	}

	xhr.ontimeout = function () {
		localProxyAvailable = false
		updateProxyStatus(statusDiv, 'error', '❌ Connection timeout')
	}

	xhr.send()
}

function updateProxyStatus(statusDiv, type, message) {
	statusDiv.textContent = message
	if (type === 'success') {
		statusDiv.style.backgroundColor = '#d4edda'
		statusDiv.style.color = '#155724'
		statusDiv.style.border = '1px solid #c3e6cb'
	} else if (type === 'error') {
		statusDiv.style.backgroundColor = '#f8d7da'
		statusDiv.style.color = '#721c24'
		statusDiv.style.border = '1px solid #f5c6cb'
	} else if (type === 'testing') {
		statusDiv.style.backgroundColor = '#fff3cd'
		statusDiv.style.color = '#856404'
		statusDiv.style.border = '1px solid #ffeaa7'
	} else {
		statusDiv.style.backgroundColor = '#f0f0f0'
		statusDiv.style.color = '#666'
		statusDiv.style.border = '1px solid #ddd'
	}
}

/**
 * Check if a URL contains embedded HTTP Basic Auth credentials
 * e.g., https://user:pass@example.com/
 */
function hasEmbeddedCredentials(url) {
	try {
		var parsed = new URL(url)
		return parsed.username !== '' || parsed.password !== ''
	} catch (e) {
		// Fallback: check for user:pass@ pattern
		return /^https?:\/\/[^\/]*:[^\/]*@/.test(url)
	}
}

/**
 * Strip credentials from a URL and return { cleanUrl, username, password }
 * e.g., https://user:pass@example.com/ → { cleanUrl: https://example.com/, username: 'user', password: 'pass' }
 */
function stripCredentialsFromUrl(url) {
	try {
		var parsed = new URL(url)
		var username = decodeURIComponent(parsed.username)
		var password = decodeURIComponent(parsed.password)
		parsed.username = ''
		parsed.password = ''
		return {
			cleanUrl: parsed.toString(),
			username: username,
			password: password,
			hasAuth: username !== '' || password !== ''
		}
	} catch (e) {
		return {
			cleanUrl: url,
			username: '',
			password: '',
			hasAuth: false
		}
	}
}

/**
 * Build a Base64-encoded Basic Auth header value from username and password
 */
function buildBasicAuthHeader(username, password) {
	var credentials = username + ':' + password
	return 'Basic ' + btoa(credentials)
}

function initWarningsOnly() {
	var warningsCheckbox = document.getElementById("level")
	if (!warningsCheckbox) {
		return
	}
	if (supportsLocalStorage() && localStorage["warningsOnly"] == "yes") {
		warningsCheckbox.checked = true
	}
	warningsCheckbox.addEventListener("change", function (e) {
		if (supportsLocalStorage()) {
			if (e.target.checked) {
				localStorage["warningsOnly"] = "yes"
			} else {
				localStorage["warningsOnly"] = "no"
			}
		}
	}, false)
}

function initShowDuplicates() {
	var showDuplicatesCheckbox = document.getElementById("showduplicates")
	if (!showDuplicatesCheckbox) {
		return
	}
	if (supportsLocalStorage() && localStorage["showDuplicates"] == "yes") {
		showDuplicatesCheckbox.checked = true
	}
	showDuplicatesCheckbox.addEventListener("change", function (e) {
		if (supportsLocalStorage()) {
			if (e.target.checked) {
				localStorage["showDuplicates"] = "yes"
			} else {
				localStorage["showDuplicates"] = "no"
			}
		}
	}, false)
}

function initUserAgents() {
	var userAgents = document.querySelector("#useragents")
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (Linux; Android 4.4.2; en-us; SC-04E Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/1.5 Chrome/28.0.1500.94 Mobile Safari/537.36',
		'Android'))
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
		'Chrome'))
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (Windows NT 6.3; rv:36.0) Gecko/20100101 Firefox/36.0',
		'Firefox'))
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko',
		'Internet Explorer'))
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25',
		'iPhone/iOS Safari'))
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.89 Safari/537.36 OPR/28.0.1750.48',
		'Opera'))
	userAgents.appendChild(createLabeledOption(
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/600.4.10 (KHTML, like Gecko) Version/8.0.4 Safari/600.4.10',
		'Safari'))
	userAgents.appendChild(createLabeledOption(
		'Validator.nu/LV',
		'default'))
	document.querySelector("span.extraoptions").appendChild(userAgents)
	document.querySelector("input[list=useragents]").setAttribute("disabled", "")
	document.querySelector('input[name=acceptlanguage]').setAttribute("disabled", "")
}

function createLabeledOption(value, label) {
	var rv = createHtmlElement('option')
	rv.value = value
	rv.label = label
	return rv
}

function createOption(text, value) {
	var rv = createHtmlElement('option')
	rv.value = value
	var tn = document.createTextNode(text)
	rv.appendChild(tn)
	return rv
}

function formSubmission() {
	if (document.getElementsByTagName) {
		var form = document.getElementsByTagName("form")[0]
		if (form.checkValidity) {
			if (!form.checkValidity()) {
				return true
			}
		}
	}
	disableByIdIfEmptyString("doc")
	var modeSelect = document.getElementById('docselect')
	if (modeSelect) {
		if (modeSelect.value === 'textarea' && textareaHidden && textarea) {
			textareaHidden.value = textarea.value
		} else if (modeSelect.value === 'multiurl') {
			// Multi URLs mode - handle client-side validation
			handleMultiUrlValidation()
			return false // Prevent default form submission
		} else {
			// Address/URL mode - remove multiurl hidden input and textareaHidden
			var multiUrlModeField = document.querySelector('input[name="multiurl"]')
			if (multiUrlModeField && multiUrlModeField.parentNode) {
				multiUrlModeField.parentNode.removeChild(multiUrlModeField)
			}
			if (textareaHidden && textareaHidden.parentNode) {
				textareaHidden.parentNode.removeChild(textareaHidden)
			}
		}
	}
	return true
}

function undoFormSubmission() {
	enableById("doc")
	return true
}

function disableById(id) {
	var field = document.getElementById(id)
	if (field) {
		field.disabled = true
	}
}

function disableByIdIfEmptyString(id) {
	var field = document.getElementById(id)
	if (field) {
		if ("" == field.value) {
			field.disabled = true
		}
	}
}

function enableById(id) {
	var field = document.getElementById(id)
	if (field) {
		field.disabled = false
	}
}

function createHtmlElement(tagName) {
	return document.createElementNS ? document.createElementNS("http://www.w3.org/1999/xhtml", tagName) : document.createElement(tagName)
}

function injectHyperlinks() {
	var errors = document.getElementsByClassName("error")
	var warnings = document.getElementsByClassName("warning")
	var info = document.getElementsByClassName("info")
	linkify(info, "has no effect",
		"https://github.com/validator/validator/wiki/Markup-%C2%BB-Void-elements#trailing-slashes-in-void-element-start-tags-do-not-mark-the-start-tags-as-self-closing",
		"Trailing slashes in void-element start tags do not mark the start tags as self-closing")
	linkify(info, "interacts badly with unquoted attribute values",
		"https://github.com/validator/validator/wiki/Markup-%C2%BB-Void-elements#trailing-slashes-directly-preceded-by-unquoted-attribute-values",
		"Trailing slashes directly preceded by unquoted attribute values")
	linkify(warnings, "file an issue report",
		"https://github.com/validator/validator/issues/new",
		"File a report in the GitHub issue tracker.")
	linkify(warnings, "checking against the HTML5 + RDFa 1.1 schema",
		"about.html#rdfa",
		"About HTML5 + RDFa 1.1 checking.")
	linkify(warnings, "are treated as top-level headings by many screen readers and other tools",
		"https://html5accessibility.com/stuff/2021/07/08/preserved-in-html/",
		"HTML heading usage and tools support")
	linkify(warnings, "add identifying headings to all sections",
		"https://www.w3.org/wiki/HTML/Usage/Headings/Missing",
		"Identifying section elements with headings")
	linkify(warnings, "add identifying headings to all articles",
		"https://www.w3.org/wiki/HTML/Usage/Headings/Missing",
		"Identifying article elements with headings")
	linkify(errors, "the Media Types section in the current Media Queries specification",
		"https://drafts.csswg.org/mediaqueries/#media-types",
		"Media Types sections in the Media Queries specification")
	linkify(errors, "the Deprecated Media Features section in the current Media Queries specification",
		"https://drafts.csswg.org/mediaqueries/#mf-deprecated",
		"Deprecated Media Features section in the current Media Queries specification")
	linkify(errors, "all image candidate strings must specify a width",
		"https://ericportis.com/posts/2014/srcset-sizes/",
		"srcset and sizes overview")
	linkify(info, "https://www.w3.org/International/articles/ruby/markup.en.html#visual",
		"https://www.w3.org/International/articles/ruby/markup.en.html#visual",
		"W3C guidance on ruby markup")
}

function replaceSuccessFailure() {
	successfailure = document.querySelector(".success, .failure")
	if (successfailure === null) return

	// Check if we're in multi-URL mode
	var isMultiUrl = document.getElementById('multi-url-results') !== null

	if (document.querySelector(".non-document-error") !== null) {
		successfailure.className = "fatalfailure"
		successfailure.textContent = "Document checking not completed."
		successfailure.textContent += " The result cannot be determined due to a non-document-error."
	} else {
		// In multi-URL mode, check for visible errors/warnings within the multi-URL container
		var hasVisibleErrors
		if (isMultiUrl) {
			var multiUrlContainer = document.getElementById('multi-url-results')
			hasVisibleErrors = multiUrlContainer && multiUrlContainer.querySelector(".error:not(.hidden), .warning:not(.hidden)") !== null
		} else {
			hasVisibleErrors = document.querySelector(".error:not(.hidden), .warning:not(.hidden)") !== null
		}

		if (hasVisibleErrors) {
			successfailure.className = "failure"
			// In multi-URL mode, keep the original text with counts
			if (!isMultiUrl) {
				successfailure.textContent = "Document checking completed."
			}
		} else {
			successfailure.className = "success"
			// In multi-URL mode, keep the original text with counts
			if (!isMultiUrl) {
				successfailure.textContent = "Document checking completed. No errors or warnings to show."
			}
		}
	}

	if (document.querySelector("#results > ol:first-child") !== null) {
		if (document.querySelector("#results > ol:first-child li:not(.hidden)") === null) {
			document.querySelector("#results > ol:first-child").className = "hidden"
		} else {
			document.querySelector("#results > ol:first-child").className = ""
		}
	}
	// replace empty <ol> artifacts in the outline caused by <hgroup>
	var emptyOls = document.querySelectorAll("#outline ol:empty")
	for (var i = 0; i < emptyOls.length; i++) {
		emptyOls[i].remove()
	}

}

function replaceYearWarning() {
	var warnings = document.querySelectorAll(".warning")
	for (var i = 0; i < warnings.length; ++i) {
		warnings[i].firstChild.lastChild.lastChild.textContent =
			warnings[i].firstChild.lastChild.lastChild.textContent
				.replace(/Year may be mistyped.*/, "Year may be mistyped.")
	}
}

function linkify(messages, text, target, title) {
	if (!messages) return
	for (var i = 0; i < messages.length; ++i) {
		messages[i].firstChild.lastChild.innerHTML =
			messages[i].firstChild.lastChild.innerHTML.replace(text,
				"<a href='" + target + "' title='" + title + "'>" + text + "</a>");
	}
}

function moveLangAndDirWarningsAndAddLinks() {
	var warnings = document.getElementsByClassName("warning")
	var messagesContainer = document.querySelector("#results > ol:first-child")
	var langOrDirWarningText = "This document appears to be written in"
	var undetectedMissingLang = "Consider adding a lang attribute"
	var contentLanguageText = "The value of the HTTP Content-Language header is"
	var langTextWithNoLangGuidance = 'For further guidance, consult <a href="https://www.w3.org/International/questions/qa-no-language#nonlinguistic">Tagging text with no language</a>, <a href="https://www.w3.org/International/techniques/authoring-html.en?open=language&open=textprocessing#textprocessing">Declaring the overall language of a page</a> and <a href="https://www.w3.org/International/techniques/authoring-html.en?open=language&open=langvalues#langvalues">Choosing language tags</a>.'
	var langGuidance = 'For further guidance, consult <a href="https://www.w3.org/International/techniques/authoring-html.en?open=language&open=textprocessing#textprocessing">Declaring the overall language of a page</a> and <a href="https://www.w3.org/International/techniques/authoring-html.en?open=language&open=langvalues#langvalues">Choosing language tags</a>.'
	var contentLangGuidance = 'For further guidance, consult <a href="https://www.w3.org/International/questions/qa-http-and-lang">HTTP headers, meta elements and language information</a>.'
	var dirGuidance = 'For further guidance, consult <a href="https://www.w3.org/International/questions/qa-html-dir">Structural markup and right-to-left text in HTML</a> and <a href="https://www.w3.org/International/techniques/authoring-html#using">Setting up a right-to-left page</a>.'
	var ifMisidentifiedGuidance = 'If the HTML checker has misidentified the language of this document, please <a href="https://github.com/validator/validator/issues/new?template=4-bad-language-detection.yml">file an issue report</a>.'
	var langOrDirWarning
	var langOrDirLinks
	var ifMisidentifiedLinks
	var warningText
	for (var i = 0; i < warnings.length; ++i) {
		warningText = warnings[i].firstChild.lastChild.textContent
		if (warningText.indexOf(langOrDirWarningText) != -1 || warningText.indexOf(undetectedMissingLang) != -1) {
			langOrDirWarning = warnings[i]
			langOrDirLinks = document.createElement("p")
			if (warningText.indexOf("written in Lorem ipsum text") != -1) {
				warnings[i].firstChild.lastChild.innerHTML
					= warnings[i].firstChild.lastChild.innerHTML.replace(/written in/, "")
				warnings[i].firstChild.lastChild.innerHTML
					= warnings[i].firstChild.lastChild.innerHTML.replace(/Lorem ipsum/, "<i>Lorem ipsum</i>")
				langOrDirLinks.innerHTML = langTextWithNoLangGuidance
			} else if (warningText.indexOf("lang=") != -1 || warningText.indexOf(undetectedMissingLang) != -1) {
				langOrDirLinks.innerHTML = langGuidance
			} else if (warningText.indexOf("Content-Language") != -1) {
				langOrDirLinks.innerHTML = contentLangGuidance
			} else if (warningText.indexOf("dir=") != 1) {
				langOrDirLinks.innerHTML = dirGuidance
			}
			langOrDirWarning.appendChild(langOrDirLinks)
			ifMisidentifiedLinks = document.createElement("p")
			ifMisidentifiedLinks.setAttribute("class", "reportbug")
			ifMisidentifiedLinks.innerHTML = ifMisidentifiedGuidance
			langOrDirWarning.appendChild(ifMisidentifiedLinks)
			messagesContainer.insertBefore(langOrDirWarning, messagesContainer.firstChild)
		} else if (warningText.indexOf(contentLanguageText) != -1) {
			langOrDirWarning = warnings[i]
			langOrDirLinks = document.createElement("p")
			langOrDirLinks.innerHTML = contentLangGuidance
			langOrDirWarning.appendChild(langOrDirLinks)
			messagesContainer.insertBefore(langOrDirWarning, messagesContainer.firstChild)
		}
	}
}

function reflow(element) {
	if (element.offsetHeight) {
		var reflow = element.offsetHeight
	}
}

function installTextarea() {
	var input = document.getElementById('doc')
	var inputRegion = document.getElementById("inputregion")
	if (input && textarea) {
		var form = document.forms[0]
		if (form) {
			form.method = 'post'
			form.enctype = 'multipart/form-data'
			if (document.getElementById("xnote")) {
				input.parentNode.removeChild(document.getElementById("xnote"))
			}
			inputRegion.removeChild(input)
			if (!document.getElementById("csslabel")) {
				var cssLabel = document.createElement("label")
				cssLabel.setAttribute("id", "csslabel")
				cssLabel.setAttribute("title", "Check the text input as CSS, not as HTML.")
				cssLabel.setAttribute("for", "css")
				var cssCheckbox = document.createElement("input")
				cssCheckbox.setAttribute("type", "checkbox")
				cssCheckbox.setAttribute("name", "css")
				cssCheckbox.setAttribute("id", "css")
				cssCheckbox.setAttribute("value", "yes")
				if (supportsLocalStorage() && localStorage["inputWasCss"] == "yes") {
					cssCheckbox.checked = true
				}
				cssCheckbox.addEventListener("change", function (e) {
					if (document.getElementById('doc').value == htmlBoilerplate
						&& e.target.checked) {
						document.getElementById('doc').value = ""
					}
					if (document.getElementById('doc').value == ""
						&& !e.target.checked) {
						document.getElementById('doc').value = htmlBoilerplate
					}
					if (supportsLocalStorage()) {
						if (e.target.checked) {
							localStorage["inputWasCss"] = "yes"
						} else {
							localStorage["inputWasCss"] = "no"
						}
					}
				}, false)
				cssLabel.appendChild(cssCheckbox)
				cssLabel.appendChild(document.createTextNode("check as CSS"))
				inputRegion.appendChild(cssLabel)
			}
			inputRegion.appendChild(textarea)
			reflow(textarea)
		}
	}
	if (textareaHidden) {
		var submit = document.getElementById("submit")
		if (submit) {
			submit.parentNode.appendChild(textareaHidden)
		}
	}
}

function installFileUpload() {
	var input = document.getElementById('doc')
	if (input && fileInput) {
		var form = document.forms[0]
		if (form) {
			if (document.getElementById("csslabel")) {
				input.parentNode.removeChild(document.getElementById("csslabel"))
			}
			form.method = 'post'
			form.enctype = 'multipart/form-data'
			input.parentNode.replaceChild(fileInput, input)
			if (!document.querySelector("#xnote")) {
				var xnote = document.createElement("div")
				xnote.setAttribute('id', 'xnote')
				xnote.appendChild(document.createTextNode(
					"Uploaded files with .xhtml or .xht"
					+ " extensions are parsed using"
					+ " the XML parser."))
				document.getElementById("inputregion")
					.appendChild(xnote)
			}
			reflow(fileInput)
		}
	}
	if (textareaHidden && textareaHidden.parentNode) {
		textareaHidden.parentNode.removeChild(textareaHidden)
	}
}

function installMultiUrlInput() {
	var input = document.getElementById('doc')
	if (input && multiUrlInput) {
		var form = document.forms[0]
		if (form) {
			if (document.getElementById("csslabel")) {
				input.parentNode.removeChild(document.getElementById("csslabel"))
			}
			form.method = 'get'
			form.enctype = ''
			if (document.getElementById("xnote")) {
				input.parentNode.removeChild(document.getElementById("xnote"))
			}
			input.parentNode.replaceChild(multiUrlInput, input)
			reflow(multiUrlInput)

			// Add hidden input to indicate multi URL mode
			if (multiUrlModeInput && !document.querySelector('input[name="multiurl"]')) {
				var submit = document.getElementById("submit")
				if (submit && submit.parentNode) {
					submit.parentNode.insertBefore(multiUrlModeInput, submit)
				}
			}
		}
	}
	if (textareaHidden && textareaHidden.parentNode) {
		textareaHidden.parentNode.removeChild(textareaHidden)
	}
}

function installUrlInput() {
	var input = document.getElementById('doc')
	if (input && urlInput) {
		var form = document.forms[0]
		if (form) {
			form.method = 'get'
			form.enctype = ''
			if (document.getElementById("xnote")) {
				input.parentNode.removeChild(document.getElementById("xnote"))
			}
			if (document.getElementById("csslabel")) {
				input.parentNode.removeChild(document.getElementById("csslabel"))
			}
			input.parentNode.replaceChild(urlInput, input)
			reflow(urlInput)
		}
	}
	if (textareaHidden && textareaHidden.parentNode) {
		textareaHidden.parentNode.removeChild(textareaHidden)
	}
}

function copySourceIntoTextArea() {
	if (document.getElementById('source') === null) {
		return
	}
	var strings = []
	var source = document.getElementById('source').nextSibling;
	if (source && textarea) {
		var li = source.firstChild
		while (li) {
			var code = li.firstChild
			if (code == null) {
				return
			}
			if (hasTextContent) {
				strings.push(code.textContent)
			}
			else {
				strings.push(code.innerText)
			}
			li = li.nextSibling
		}
		textarea.value = strings.join('\n')
		// Strip CSS-checking wrapper if it leaked into the source display.
		// The server wraps CSS input in an HTML document with <style>; the
		// source display normally strips this, but guard against stacking.
		var cssProlog = "<!DOCTYPE html><html lang=\'\'><title>s</title><style>"
		var cssEpilog = "</style>"
		var v = textarea.value
		if (v.indexOf(cssProlog) === 0
			&& v.lastIndexOf(cssEpilog) === v.length - cssEpilog.length) {
			v = v.substring(cssProlog.length, v.length - cssEpilog.length)
			if (v.charAt(0) === '\n') v = v.substring(1)
			if (v.charAt(v.length - 1) === '\n') v = v.substring(0, v.length - 1)
			textarea.value = v
		}
	}
}

function hideSourceIfNotRequested() {
	var showSourceCheckbox = document.getElementById("showsource")
	if (showSourceCheckbox && !showSourceCheckbox.checked) {
		var sourceHeading = document.getElementById('source')
		if (sourceHeading) {
			var sourceList = sourceHeading.nextSibling
			while (sourceList && sourceList.nodeType != 1) {
				sourceList = sourceList.nextSibling
			}
			if (sourceList && sourceList.className == 'source') {
				sourceHeading.style.display = 'none'
				sourceList.style.display = 'none'
			}
		}
	}
}

function updateFragmentIdHilite() {
	var fragment = window.location.hash
	var selector = null
	if (linePattern.exec(fragment)) {
		selector = fragment + " *"
	} else if (exactPattern.exec(fragment)) {
		selector = fragment
	} else if (rangePattern.exec(fragment)) {
		selector = "html b." + fragment.substring(1)
	}
	var rule = ''
	if (selector) {
		rule = selector + " { background-color: #ffcccc; font-weight: bold; }"
	}
	var newStyle = createHtmlElement('style')
	var ex
	try {
		newStyle.appendChild(document.createTextNode(rule))
	} catch (ex) {
		if (ex.number == -0x7FFF0001) {
			newStyle.styleSheet.cssText = rule
		} else {
			throw ex
		}
	}
	dynamicStyle.parentNode.replaceChild(newStyle, dynamicStyle)
	dynamicStyle = newStyle
}

function emulateHashChanged() {
	var hash = window.location.hash
	if (prevHash != hash) {
		updateFragmentIdHilite()
		prevHash = hash
	}
}

if (document.getElementById) {
	window.onload = reboot
	if (document.addEventListener) {
		document.addEventListener("DOMContentLoaded", function () {
			window.onload = undefined
			reboot()
			setTimeout(function () {
				var filtersbutton = document.querySelector("#filters button")
				var helptext = document.querySelector("#filters > div")
				if (filtersbutton) {
					filtersbutton.className = "message_filtering"
					if (!window.location.hash) {
						filtersbutton.focus()
					}
					filtersbutton.setAttribute('tabindex', '0')
				}
				if (helptext) {
					helptext.className = "message_filtering"
				}
			}, 500);
		}, false)
	}
	window.onunload = undoFormSubmission
	window.onabort = undoFormSubmission
	boot()
}

/**
 * Categorizes a validation message as 'css', 'i18n', or 'html'.
 * NOTE: This function is duplicated in site/message-category.js for unit testing.
 * If you modify this function, update message-category.js to match.
 */
function getMessageCategory(messageText) {
	// CSS validation errors (always prefixed with "CSS:")
	if (/^CSS:/.test(messageText)) {
		return 'css'
	}

	// Encoding and internationalization issues
	if (/\b(encoding|charset|UTF-8|windows-\d+|iso-\d+|Content-Language)\b/i.test(messageText) ||
		/appears to be written in/i.test(messageText) ||
		/\b(lang|dir)=/i.test(messageText) ||
		/"lang"/.test(messageText) ||
		/"dir"/.test(messageText) ||
		/Unicode Normalization/.test(messageText)) {
		return 'i18n'
	}

	// Everything else is HTML (including ARIA)
	return 'html'
}


function initFilters() {
	var errors,
		warnings,
		info,
		filters,
		helptext,
		heading,
		filtersButton,
		makeFieldset,
		fieldsets,
		fieldset,
		legend,
		toggleFilters,
		checkboxes,
		links,
		messageCollection,
		className,
		links,
		mainForm

	if (!document.getElementsByClassName || !document.querySelectorAll) {
		return
	}
	if (document.getElementsByClassName('non-document-error').length > 0) {
		replaceSuccessFailure()
		return
	}

	// Remove existing filters section if it exists (for multi-URL mode re-initialization)
	var existingFilters = document.getElementById('filters')
	if (existingFilters && existingFilters.parentNode) {
		existingFilters.parentNode.removeChild(existingFilters)
	}

	// Check if we're in multi-URL mode
	var isMultiUrl = document.getElementById('multi-url-results') !== null

	if (isMultiUrl) {
		// In multi-URL mode, find messages within the multi-URL container
		var multiUrlContainer = document.getElementById('multi-url-results')
		errors = multiUrlContainer.querySelectorAll('.error')
		warnings = multiUrlContainer.querySelectorAll('.warning')
		info = multiUrlContainer.querySelectorAll('[class=info]')
	} else {
		// In single-URL mode, use the standard approach
		errors = document.getElementsByClassName("error")
		warnings = document.getElementsByClassName('warning')
		info = document.querySelectorAll('[class=info]')
	}

	if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
		// If there are no messages, we don’t need filtering
		return
	}
	filters = document.createElement("section")
	filters.id = "filters"
	filters.className = "unexpanded"
	heading = document.createElement("h2")
	helptext = document.createElement("div")
	helptext.appendChild(document.createTextNode("Use the Message Filtering button below to hide/show particular messages, and to see total counts of errors and warnings."))
	filters.appendChild(helptext)
	filtersButton = document.createElement("button")
	filtersButton.appendChild(document.createTextNode("Message Filtering"))
	heading.appendChild(filtersButton)
	filters.appendChild(heading)

	// Generate errors/warnings/info fieldsets
	makeFieldset = function (messages, displayType) {
		var fieldset,
			legend,
			hide,
			show,
			showHtml,
			messageList,
			messageGroupList,
			checkbox,
			listitem,
			hidegroup,
			showgroup,
			message,
			messagesObject = {},
			messagesSorted = [],
			type = displayType.toLowerCase(),
			messageGroup,
			uniqueMessage,
			makeCheckbox,
			categoryCounts = { html: 0, css: 0, i18n: 0 },
			messageTypeClass = ''

		// Derive messageTypeClass from DOM elements
		if (messages.length > 0) {
			if (messages[0].classList.contains('error')) messageTypeClass = 'error'
			else if (messages[0].classList.contains('warning')) messageTypeClass = 'warning'
			else if (messages[0].classList.contains('info')) messageTypeClass = 'info'
		}

		makeCheckbox = function (messageName, messageCollection) {
			var checkbox, label, listitem,
				messageSpan = document.getElementById(messageCollection[0]).getElementsByTagName("p")[0].getElementsByTagName("span")[0].cloneNode(true)

			checkbox = document.createElement("input")
			checkbox.type = "checkbox"
			checkbox.checked = "checked"
			checkbox.vnuMessageName = messageName
			checkbox.vnuMessageCollection = messageCollection
			checkbox.vnuMessageType = type
			label = document.createElement("label")
			label.appendChild(checkbox)
			label.appendChild(messageSpan)
			if (messageCollection.length > 1) {
				label.appendChild(document.createTextNode(' (' + messageCollection.length.toString() + ')'))
			}

			// Restore saved checkbox value from local storage
			if (supportsLocalStorage()) {
				if (localStorage.hasOwnProperty(type + ':' + messageName) && localStorage[type + ':' + messageName] === 'false') {
					checkbox.checked = false
					for (var i = 0; i < messageCollection.length; ++i) {
						document.getElementById(messageCollection[i]).className += ' hidden'
					}
				}
			}

			listitem = document.createElement("li")
			listitem.appendChild(label)
			return listitem
		}

		if (messages.length > 0) {

			// Find the unique messages and categorize them
			for (var i = 0; i < messages.length; ++i) {
				message = messages[i]
				messageClone = messages[i].cloneNode(true)
				uniqueMessage = messageClone.getElementsByTagName('p')[0].getElementsByTagName('span')[0].textContent
				messageGroupEl = messageClone.getElementsByTagName('p')[0].getElementsByTagName('span')[0].cloneNode(true)
				messageGroupElCode = messageGroupEl.getElementsByTagName("code")
				for (var j = 0; j < messageGroupElCode.length; ++j) {
					messageGroupElCode[j].textContent = "___"
					if (messageGroupElCode[j].parentNode instanceof HTMLAnchorElement) {
						messageGroupElCode[j].parentNode.removeAttribute("href")
					}
				}
				messageGroup = messageGroupEl.textContent
				messageGroupNode = messageGroupEl

				if (!messages.hasOwnProperty(messageGroup)) {
					messages[messageGroup] = {
						messageCollection: [],
						uniqueMessages: {},
						uniqueMessagesLength: 0,
						messageGroupNode: messageGroupNode
					}
				}
				messages[messageGroup].messageCollection.push(message)

				if (!messages[messageGroup].uniqueMessages.hasOwnProperty(uniqueMessage)) {
					messages[messageGroup].uniqueMessages[uniqueMessage] = []
					messages[messageGroup].uniqueMessagesLength += 1
				}
				var id = "vnuId" + idCount
				message.id = id

				// Add category as data attribute
				var category = getMessageCategory(uniqueMessage)
				message.setAttribute('data-category', category)
				categoryCounts[category]++

				messages[messageGroup].uniqueMessages[uniqueMessage].push(id)
				idCount++
			}

			// Generate Hide/Show All buttons
			fieldset = document.createElement("fieldset")
			fieldset.className = "hidden"
			legend = document.createElement("legend")
			legend.appendChild(document.createTextNode(displayType + " (" + messages.length + ") · "))
			hide = document.createElement("a")
			hide.href = ""
			show = hide.cloneNode(true)
			hide.className = "hide"
			show.className = "show"
			hide.appendChild(document.createTextNode("Hide all " + type))
			show.appendChild(document.createTextNode("Show all " + type))
			legend.appendChild(hide)
			legend.appendChild(document.createTextNode(" · "))
			legend.appendChild(show)

			// Add "Show only HTML" link if we have non-HTML messages
			if (categoryCounts.css > 0 || categoryCounts.i18n > 0) {
				showHtml = document.createElement("a")
				showHtml.href = ""
				showHtml.className = "show-html"
				showHtml.appendChild(document.createTextNode("Show only HTML " + type + " (" + categoryCounts.html + ")"))
				showHtml.setAttribute('data-message-type', messageTypeClass)
				legend.appendChild(document.createTextNode(" · "))
				legend.appendChild(showHtml)
			}

			fieldset.appendChild(legend)

			messageList = document.createElement("ol")
			for (messageGroup in messages) {
				if (messages.hasOwnProperty(messageGroup)) {
					messageGroupList = document.createElement("ol")
					for (uniqueMessage in messages[messageGroup].uniqueMessages) {
						if (messages[messageGroup].uniqueMessages.hasOwnProperty(uniqueMessage)) {
							var box = makeCheckbox(uniqueMessage, messages[messageGroup].uniqueMessages[uniqueMessage])
							if (messages[messageGroup].uniqueMessagesLength === 1) {
								messageList.appendChild(box)
							} else {
								messageGroupList.appendChild(box)
							}
						}
					}

					if (messages[messageGroup].uniqueMessagesLength > 1) {
						listitem = document.createElement("li")
						listitem.appendChild(messages[messageGroup].messageGroupNode)
						listitem.appendChild(document.createTextNode(' (' + messages[messageGroup].messageCollection.length.toString() + ') · '))
						hidegroup = document.createElement("a")
						hidegroup.href = ""
						showgroup = hidegroup.cloneNode(true)
						hidegroup.className = "hide"
						showgroup.className = "show"
						hidegroup.appendChild(document.createTextNode("Hide all"))
						showgroup.appendChild(document.createTextNode("Show all"))
						listitem.appendChild(hidegroup)
						listitem.appendChild(document.createTextNode(" · "))
						listitem.appendChild(showgroup)
						listitem.appendChild(messageGroupList)
						messageList.appendChild(listitem)
					}
				}
			}

			fieldset.appendChild(messageList)
			filters.appendChild(fieldset)
		}
	}

	showCount = function () {
		var count, span

		// In multi-URL mode, count hidden messages within the multi-URL container
		if (isMultiUrl) {
			var multiUrlContainer = document.getElementById('multi-url-results')
			count = multiUrlContainer ? multiUrlContainer.querySelectorAll("li.hidden") : []

			// Update the overall status with current visible counts
			updateMultiUrlOverallStatus(multiUrlContainer)

			// Update duplicate section counts
			updateDuplicateSectionCounts()
		} else {
			count = document.querySelectorAll("body ol > li.hidden")
		}

		span = document.querySelector(".filtercount")
		if (span) {
			span.parentNode.removeChild(span)
		}
		if (count.length > 0) {
			span = document.createElement("span")
			span.className = "filtercount"
			span.appendChild(document.createTextNode(count.length.toString() + (count.length === 1 ? " message" : " messages") + " hidden by filtering"))
			heading.appendChild(document.createTextNode(" "))
			heading.appendChild(span)
		}
		replaceSuccessFailure()
	}

	makeFieldset(errors, 'Errors')
	makeFieldset(warnings, 'Warnings')
	makeFieldset(info, 'Info messages')
	showCount()

	mainForm = document.getElementsByTagName("form")[0]

	// Both single-URL and multi-URL modes: insert filters after the form
	// This keeps the Message Filtering button outside the results area
	if (mainForm && mainForm.parentNode) {
		mainForm.parentNode.insertBefore(filters, mainForm.nextSibling)
	}
	var autofocusEl = document.querySelector("*[autofocus]")
	if (autofocusEl) {
		autofocusEl.removeAttribute("autofocus")
	}
	var tabindexEl = document.querySelector("*[tabindex]")
	if (tabindexEl) {
		tabindexEl.removeAttribute("tabindex")
	}
	fieldsets = filters.getElementsByTagName("fieldset")

	toggleFilters = function () {
		if (helptext.className === "expanded") {
			helptext.className = "message_filtering"
			helptext.textContent = "Use the Message Filtering button below to display options for hiding/showing particular messages, and to see total counts of errors and warnings."
		} else {
			helptext.className = "expanded"
			helptext.textContent = "Press the Message Filtering button to collapse the filtering options and error/warning/info counts."
		}
		filters.className === "expanded" ? filters.className = "unexpanded" : filters.className = "expanded"
		for (var i = 0; i < fieldsets.length; ++i) {
			fieldset = fieldsets[i]
			fieldset.className === "hidden" ? fieldset.className = "unhidden" : fieldset.className = "hidden"
		}
	}

	// Add event listener for the filters button
	filtersButton.addEventListener('click', function (e) {
		toggleFilters()
	}, false)

	// Show/hide the messages when the checkboxes are toggled
	checkboxes = document.getElementById("filters").getElementsByTagName("input")
	for (var i = 0; i < checkboxes.length; ++i) {
		checkboxes[i].addEventListener("change", function (e) {
			messageCollection = e.target.vnuMessageCollection
			for (var j = 0; j < messageCollection.length; ++j) {
				className = document.getElementById(messageCollection[j]).className
				if (e.target.checked) {
					document.getElementById(messageCollection[j]).className = className.replace(/\s*hidden\s*/g, "")
				} else {
					document.getElementById(messageCollection[j]).className += ' hidden'
				}
				if (supportsLocalStorage()) {
					localStorage[e.target.vnuMessageType + ':' + e.target.vnuMessageName] = e.target.checked
				}
			}
			showCount()
		}, false)
	}

	links = document.getElementsByClassName("hide")
	for (var n = 0; n < links.length; ++n) {
		links[n].addEventListener("click", function (e) {
			if (e.target.className !== "hide") {
				return
			}
			e.preventDefault()
			var boxes
			if (e.target.parentNode.getElementsByTagName("ol").length > 0) {
				// If this item has <ol> descendants, then
				// it must be a message group, in which
				// case we go back up the tree to its
				// parent, which is an <li>, and get the
				// checkboxes descendants of that.
				boxes = e.target.parentNode.getElementsByTagName("input")
			} else {
				// If this item has no <ol> descendants, then
				// it must not be a message group, in which
				// case we go back up the tree to its
				// parent's parent, which is a <fieldset>,
				// and get the checkboxes descendants of that.
				boxes = e.target.parentNode.parentNode.getElementsByTagName("input")
			}
			for (var i = 0; i < boxes.length; ++i) {
				var box = boxes[i]
				box.removeAttribute("checked")
				box.checked = false
				messageCollection = box.vnuMessageCollection
				for (var j = 0; j < messageCollection.length; ++j) {
					if (document.getElementById(messageCollection[j])) {
						document.getElementById(messageCollection[j]).className += ' hidden'
					}
				}
				if (supportsLocalStorage()) {
					localStorage[box.vnuMessageType + ':' + box.vnuMessageName] = false
				}
			}
			showCount()
		}, false)
	}

	links = document.getElementsByClassName("show")
	for (var n = 0; n < links.length; ++n) {
		links[n].addEventListener("click", function (e) {
			if (e.target.className !== "show") {
				return
			}
			e.preventDefault()
			var boxes
			if (e.target.parentNode.getElementsByTagName("ol").length > 0) {
				// If this item has <ol> descendants, then
				// it must be a message group, in which
				// case we go back up the tree to its
				// parent, which is an <li>, and get the
				// checkboxes descendants of that.
				boxes = e.target.parentNode.getElementsByTagName("input")
			} else {
				// If this item has no <ol> descendants, then
				// it must not be a message group, in which
				// case we go back up the tree to its
				// parent's parent, which is a <fieldset>,
				// and get the checkboxes descendants of that.
				boxes = e.target.parentNode.parentNode.getElementsByTagName("input")
			}
			for (var i = 0; i < boxes.length; ++i) {
				var box = boxes[i]
				box.checked = true
				messageCollection = box.vnuMessageCollection
				for (var j = 0; j < messageCollection.length; ++j) {
					if (document.getElementById(messageCollection[j])) {
						var className = document.getElementById(messageCollection[j]).className
						document.getElementById(messageCollection[j]).className = className.replace(/\s*hidden\s*/g, "")
					}
				}
				if (supportsLocalStorage()) {
					localStorage[box.vnuMessageType + ':' + box.vnuMessageName] = true
				}
			}
			showCount()
		}, false)
	}

	// Add event handlers for "Show only HTML" links
	links = document.getElementsByClassName("show-html")
	for (var n = 0; n < links.length; ++n) {
		links[n].addEventListener("click", function (e) {
			e.preventDefault()
			// Use currentTarget to get the element the listener is attached to
			var messageType = e.currentTarget.getAttribute('data-message-type')
			// Get all messages of this type (errors, warnings, or info)
			var allMessages = document.querySelectorAll("li." + messageType)

			for (var i = 0; i < allMessages.length; ++i) {
				var msg = allMessages[i]
				if (!msg || !msg.id) continue
				var category = msg.getAttribute('data-category')
				var msgId = msg.id

				if (category === 'html') {
					// Show HTML messages
					msg.className = msg.className.replace(/\s*hidden\s*/g, "")
					// Update corresponding checkboxes
					var boxes = document.querySelectorAll("input[type='checkbox']")
					for (var k = 0; k < boxes.length; ++k) {
						var box = boxes[k]
						if (box.vnuMessageCollection && box.vnuMessageCollection.indexOf(msgId) !== -1) {
							box.checked = true
							if (supportsLocalStorage()) {
								localStorage[box.vnuMessageType + ':' + box.vnuMessageName] = true
							}
						}
					}
				} else {
					// Hide non-HTML messages (CSS and i18n)
					if (msg.className.indexOf('hidden') === -1) {
						msg.className += ' hidden'
					}
					// Update corresponding checkboxes
					var boxes = document.querySelectorAll("input[type='checkbox']")
					for (var k = 0; k < boxes.length; ++k) {
						var box = boxes[k]
						if (box.vnuMessageCollection && box.vnuMessageCollection.indexOf(msgId) !== -1) {
							box.checked = false
							if (supportsLocalStorage()) {
								localStorage[box.vnuMessageType + ':' + box.vnuMessageName] = false
							}
						}
					}
				}
			}
			showCount()
		}, false)
	}
}

function supportsLocalStorage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null
	} catch (e) {
		return false
	}
}

// Multi-URL validation functions
function handleMultiUrlValidation() {
	var urlsTextarea = document.getElementById('doc')
	if (!urlsTextarea) return

	var urlsText = urlsTextarea.value.trim()
	if (!urlsText) return

	// Split by newlines and filter out empty lines
	var urls = urlsText.split('\n')
		.map(function (url) { return url.trim() })
		.filter(function (url) { return url.length > 0 })

	if (urls.length === 0) return

	// Detect auth URLs
	var authUrlCount = 0
	urls.forEach(function (url) {
		if (hasEmbeddedCredentials(url)) authUrlCount++
	})

	// Clear results area and show loading message
	var resultsDiv = document.getElementById('results')
	if (!resultsDiv) return

	var statusMsg = 'Validating ' + urls.length + ' URL(s)...'
	if (authUrlCount > 0) {
		statusMsg += ' (' + authUrlCount + ' with HTTP Basic Auth)'
	}
	resultsDiv.innerHTML = '<h2 class="success">' + statusMsg + '</h2>'

	// Create container for all URL results
	var allResults = {
		urls: [],
		completed: 0,
		total: urls.length
	}

	// Validate each URL
	urls.forEach(function (url, index) {
		validateSingleUrl(url, index, allResults, resultsDiv)
	})
}

function validateSingleUrl(url, index, allResults, resultsDiv) {
	var form = document.getElementsByTagName("form")[0]
	if (!form) return

	// Check if local proxy is enabled and available
	var proxyCheckbox = document.getElementById('enable-local-proxy')
	var useLocalProxy = proxyCheckbox && proxyCheckbox.checked && localProxyAvailable && localProxyUrl

	// Get form parameters
	var formData = new URLSearchParams()
	formData.append('doc', url)
	formData.append('out', 'html')

	// Add other form parameters (parser, charset, etc.)
	var inputs = form.querySelectorAll('input:not([type="hidden"]):not([name="doc"]):not([name="multiurl"]), select')
	for (var i = 0; i < inputs.length; i++) {
		var input = inputs[i]
		if (input.name && input.value) {
			if (input.type === 'checkbox') {
				if (input.checked) {
					formData.append(input.name, input.value)
				}
			} else {
				formData.append(input.name, input.value)
			}
		}
	}

	// Check if showsource checkbox is checked
	var showSourceCheckbox = document.getElementById('showsource')
	if (showSourceCheckbox && showSourceCheckbox.checked) {
		formData.append('showsource', 'yes')
	}

	// Check if showduplicates checkbox is checked
	var showDuplicatesCheckbox = document.getElementById('showduplicates')
	if (showDuplicatesCheckbox && showDuplicatesCheckbox.checked) {
		formData.append('showduplicates', 'yes')
	}

	// If using local proxy, fetch via proxy first
	if (useLocalProxy) {
		fetchViaLocalProxy(url, index, allResults, resultsDiv, formData)
		return
	}

	// Make AJAX request (direct validation)
	var xhr = new XMLHttpRequest()
	var requestUrl = window.location.pathname + '?' + formData.toString() + '&_t=' + Date.now()
	xhr.open('GET', requestUrl, true)
	xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0')
	xhr.setRequestHeader('Pragma', 'no-cache')
	xhr.setRequestHeader('Expires', '-1')

	// Add custom cookie header if enabled
	var cookieCheckbox = document.getElementById('enable-cookie')
	var cookieTextarea = document.getElementById('cookie-input')
	if (cookieCheckbox && cookieCheckbox.checked && cookieTextarea && cookieTextarea.value.trim()) {
		xhr.setRequestHeader('X-Custom-Cookie', cookieTextarea.value.trim())
	}

	xhr.onload = function () {
		if (xhr.status >= 200 && xhr.status < 400) {
			// Parse response HTML
			var parser = new DOMParser()
			var doc = parser.parseFromString(xhr.responseText, 'text/html')

			// Extract results
			var resultsOl = doc.querySelector('#results > ol:first-child')
			var successFailure = doc.querySelector('.success, .failure, .fatalfailure')

			// Clone and update IDs to make them unique for multi-URL
			var clonedResultsOl = null
			if (resultsOl) {
				clonedResultsOl = resultsOl.cloneNode(true)
				// Update all message IDs to include URL index
				var messages = clonedResultsOl.querySelectorAll('li[id^="vnuId"]')
				messages.forEach(function (msg) {
					if (msg.id) {
						msg.setAttribute('data-original-id', msg.id)
						msg.id = 'url' + index + '_' + msg.id
					}
				})
			}

			// Extract source code if available
			var sourceHeading = doc.getElementById('source')
			var sourceList = null
			if (sourceHeading) {
				var nextSibling = sourceHeading.nextSibling
				while (nextSibling && nextSibling.nodeType != 1) {
					nextSibling = nextSibling.nextSibling
				}
				if (nextSibling && nextSibling.className == 'source') {
					sourceList = nextSibling.cloneNode(true)
				}
			}

			allResults.urls[index] = {
				url: url,
				results: clonedResultsOl,
				status: successFailure ? successFailure.cloneNode(true) : null,
				sourceHeading: sourceHeading ? sourceHeading.cloneNode(true) : null,
				sourceList: sourceList
			}

			allResults.completed++

			// Update progress
			updateValidationProgress(allResults, resultsDiv)

			// If all URLs are validated, display results
			if (allResults.completed === allResults.total) {
				displayMultiUrlResults(allResults, resultsDiv)
			}
		} else {
			// Error handling
			allResults.urls[index] = {
				url: url,
				results: null,
				status: null,
				error: 'HTTP Error: ' + xhr.status
			}

			allResults.completed++

			// Update progress
			updateValidationProgress(allResults, resultsDiv)

			if (allResults.completed === allResults.total) {
				displayMultiUrlResults(allResults, resultsDiv)
			}
		}
	}

	xhr.onerror = function () {
		allResults.urls[index] = {
			url: url,
			results: null,
			status: null,
			error: 'Network error'
		}

		allResults.completed++

		// Update progress
		updateValidationProgress(allResults, resultsDiv)

		if (allResults.completed === allResults.total) {
			displayMultiUrlResults(allResults, resultsDiv)
		}
	}

	xhr.send()
}

function fetchViaLocalProxy(url, index, allResults, resultsDiv, formData) {
	// Step 1: Fetch URL content via local proxy
	// Normalize URL: remove trailing slashes
	var normalizedProxyUrl = localProxyUrl.trim().replace(/\/+$/, '')
	var fetchXhr = new XMLHttpRequest()
	fetchXhr.open('POST', normalizedProxyUrl + '/fetch-url', true)
	fetchXhr.setRequestHeader('Content-Type', 'application/json')
	fetchXhr.timeout = 30000

	// Get custom headers if any
	var customHeaders = {}
	var cookieCheckbox = document.getElementById('enable-cookie')
	var cookieTextarea = document.getElementById('cookie-input')
	if (cookieCheckbox && cookieCheckbox.checked && cookieTextarea && cookieTextarea.value.trim()) {
		customHeaders['Cookie'] = cookieTextarea.value.trim()
	}

	fetchXhr.onload = function () {
		if (fetchXhr.status === 200) {
			try {
				var proxyResponse = JSON.parse(fetchXhr.responseText)

				if (proxyResponse.success) {
					// Step 2: Send fetched content to validator
					validateContent(proxyResponse.data, url, index, allResults, resultsDiv, formData)
				} else {
					// Proxy fetch failed
					allResults.urls[index] = {
						url: url,
						results: null,
						status: null,
						error: 'Proxy fetch error: ' + (proxyResponse.error ?? 'Unknown error')
					}
					allResults.completed++
					updateValidationProgress(allResults, resultsDiv)
					if (allResults.completed === allResults.total) {
						displayMultiUrlResults(allResults, resultsDiv)
					}
				}
			} catch (e) {
				allResults.urls[index] = {
					url: url,
					results: null,
					status: null,
					error: 'Invalid proxy response'
				}
				allResults.completed++
				updateValidationProgress(allResults, resultsDiv)
				if (allResults.completed === allResults.total) {
					displayMultiUrlResults(allResults, resultsDiv)
				}
			}
		} else {
			allResults.urls[index] = {
				url: url,
				results: null,
				status: null,
				error: 'Proxy connection error: HTTP ' + fetchXhr.status
			}
			allResults.completed++
			updateValidationProgress(allResults, resultsDiv)
			if (allResults.completed === allResults.total) {
				displayMultiUrlResults(allResults, resultsDiv)
			}
		}
	}

	fetchXhr.onerror = function () {
		allResults.urls[index] = {
			url: url,
			results: null,
			status: null,
			error: 'Cannot connect to local proxy'
		}
		allResults.completed++
		updateValidationProgress(allResults, resultsDiv)
		if (allResults.completed === allResults.total) {
			displayMultiUrlResults(allResults, resultsDiv)
		}
	}

	fetchXhr.ontimeout = function () {
		allResults.urls[index] = {
			url: url,
			results: null,
			status: null,
			error: 'Proxy request timeout'
		}
		allResults.completed++
		updateValidationProgress(allResults, resultsDiv)
		if (allResults.completed === allResults.total) {
			displayMultiUrlResults(allResults, resultsDiv)
		}
	}

	fetchXhr.send(JSON.stringify({
		url: url,
		headers: customHeaders
	}))
}

function validateContent(content, originalUrl, index, allResults, resultsDiv, formData) {
	var xhr = new XMLHttpRequest()

	// Use multipart/form-data to send content for validation
	var formDataObj = new FormData()

	// Create a Blob from content and add as file
	var blob = new Blob([content], { type: 'text/html' })
	formDataObj.append('file', blob, 'document.html')
	formDataObj.append('out', 'html')

	// Add other parameters
	var entries = Array.from(formData.entries())
	for (var i = 0; i < entries.length; i++) {
		var pair = entries[i]
		if (pair[0] !== 'doc' && pair[0] !== 'out') { // Skip doc and out parameters
			formDataObj.append(pair[0], pair[1])
		}
	}

	xhr.open('POST', window.location.pathname, true)
	xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0')
	xhr.setRequestHeader('Pragma', 'no-cache')
	xhr.setRequestHeader('Expires', '-1')
	// Don't set Content-Type header - browser will set it automatically with boundary for multipart/form-data

	xhr.onload = function () {
		if (xhr.status >= 200 && xhr.status < 400) {
			// Parse response HTML
			var parser = new DOMParser()
			var doc = parser.parseFromString(xhr.responseText, 'text/html')

			// Extract results
			var resultsOl = doc.querySelector('#results > ol:first-child')
			var successFailure = doc.querySelector('.success, .failure, .fatalfailure')

			// Clone and update IDs to make them unique for multi-URL
			var clonedResultsOl = null
			if (resultsOl) {
				clonedResultsOl = resultsOl.cloneNode(true)
				// Update all message IDs to include URL index
				var messages = clonedResultsOl.querySelectorAll('li[id^="vnuId"]')
				messages.forEach(function (msg) {
					if (msg.id) {
						msg.setAttribute('data-original-id', msg.id)
						msg.id = 'url' + index + '_' + msg.id
					}
				})
			}

			// Extract source code if available
			var sourceHeading = doc.getElementById('source')
			var sourceList = null
			if (sourceHeading) {
				var nextSibling = sourceHeading.nextSibling
				while (nextSibling && nextSibling.nodeType != 1) {
					nextSibling = nextSibling.nextSibling
				}
				if (nextSibling && nextSibling.className == 'source') {
					sourceList = nextSibling.cloneNode(true)
				}
			}

			allResults.urls[index] = {
				url: originalUrl,
				results: clonedResultsOl,
				status: successFailure ? successFailure.cloneNode(true) : null,
				sourceHeading: sourceHeading ? sourceHeading.cloneNode(true) : null,
				sourceList: sourceList
			}

			allResults.completed++

			// Update progress
			updateValidationProgress(allResults, resultsDiv)

			// If all URLs are validated, display results
			if (allResults.completed === allResults.total) {
				displayMultiUrlResults(allResults, resultsDiv)
			}
		} else {
			// Error handling
			allResults.urls[index] = {
				url: originalUrl,
				results: null,
				status: null,
				error: 'Validation error: HTTP ' + xhr.status
			}

			allResults.completed++

			// Update progress
			updateValidationProgress(allResults, resultsDiv)

			if (allResults.completed === allResults.total) {
				displayMultiUrlResults(allResults, resultsDiv)
			}
		}
	}

	xhr.onerror = function () {
		allResults.urls[index] = {
			url: originalUrl,
			results: null,
			status: null,
			error: 'Validation network error'
		}

		allResults.completed++

		// Update progress
		updateValidationProgress(allResults, resultsDiv)

		if (allResults.completed === allResults.total) {
			displayMultiUrlResults(allResults, resultsDiv)
		}
	}

	xhr.send(formDataObj)
}

function updateValidationProgress(allResults, resultsDiv) {
	var progressText = 'Validating URLs... (' + allResults.completed + '/' + allResults.total + ' completed)'
	var statusElement = resultsDiv.querySelector('h2')
	if (statusElement) {
		statusElement.textContent = progressText
	}
}

function updateMultiUrlOverallStatus(multiUrlContainer) {
	if (!multiUrlContainer) return

	var overallStatus = document.getElementById('multi-url-overall-status')
	if (!overallStatus) return

	var totalUrls = parseInt(overallStatus.getAttribute('data-total-urls') ?? '0')

	// Count visible errors and warnings
	var visibleErrors = multiUrlContainer.querySelectorAll('.error:not(.hidden)')
	var visibleWarnings = multiUrlContainer.querySelectorAll('.warning:not(.hidden)')

	var errorCount = visibleErrors.length
	var warningCount = visibleWarnings.length
	var hasErrors = errorCount > 0

	// Update the status text and class
	if (hasErrors || warningCount > 0) {
		overallStatus.className = 'failure'
		overallStatus.textContent = 'Validation completed for ' + totalUrls + ' URL(s). Found ' + errorCount + ' error(s) and ' + warningCount + ' warning(s).'
	} else {
		overallStatus.className = 'success'
		overallStatus.textContent = 'Validation completed for ' + totalUrls + ' URL(s). No errors or warnings to show.'
	}
}

/**
 * Update the counts in duplicate section headings based on visible messages
 */
function updateDuplicateSectionCounts() {
	var duplicateSection = document.getElementById('duplicate-messages-section')
	if (!duplicateSection) return

	// Count visible duplicate errors
	var duplicateErrorsList = duplicateSection.querySelector('ol.duplicate-messages-list')
	if (duplicateErrorsList) {
		var errorItems = duplicateErrorsList.querySelectorAll('.duplicate-message-item')
		var visibleErrorCount = 0
		errorItems.forEach(function (item) {
			// Check if any of the messages in this duplicate group are visible
			var hasVisibleMessage = false
			var urlLinks = item.querySelectorAll('ul li a')
			urlLinks.forEach(function (link) {
				var urlIndex = parseInt(link.href.split('#url-')[1])
				if (!isNaN(urlIndex)) {
					var urlSection = document.getElementById('url-' + urlIndex)
					if (urlSection) {
						var visibleErrors = urlSection.querySelectorAll('.error:not(.hidden)')
						if (visibleErrors.length > 0) {
							hasVisibleMessage = true
						}
					}
				}
			})
			if (hasVisibleMessage) {
				visibleErrorCount++
				item.style.display = ''
			} else {
				item.style.display = 'none'
			}
		})

		// Update heading
		var errorHeading = duplicateSection.querySelector('h4')
		if (errorHeading && errorHeading.textContent.includes('Duplicate Errors')) {
			errorHeading.textContent = 'Duplicate Errors (' + visibleErrorCount + ' visible)'
		}
	}
}

/**
 * Find duplicate messages across multiple URLs
 * Returns an object with arrays of duplicate errors and warnings
 */
function findDuplicateMessages(allResults) {
	var messageMap = {
		errors: {},
		warnings: {}
	}

	// Collect all messages from all URLs
	allResults.urls.forEach(function (urlResult, urlIndex) {
		if (!urlResult.results) return

		// Process errors
		var errors = urlResult.results.querySelectorAll('.error')
		errors.forEach(function (errorEl) {
			var messageText = extractMessageText(errorEl)
			if (!messageText) return

			if (!messageMap.errors[messageText]) {
				messageMap.errors[messageText] = {
					text: messageText,
					fullElement: errorEl.cloneNode(true),
					urlIndices: [],
					occurrences: []
				}
			}
			messageMap.errors[messageText].urlIndices.push(urlIndex)
			messageMap.errors[messageText].occurrences.push({
				urlIndex: urlIndex,
				element: errorEl.cloneNode(true)
			})
		})

		// Process warnings
		var warnings = urlResult.results.querySelectorAll('.warning')
		warnings.forEach(function (warningEl) {
			var messageText = extractMessageText(warningEl)
			if (!messageText) return

			if (!messageMap.warnings[messageText]) {
				messageMap.warnings[messageText] = {
					text: messageText,
					fullElement: warningEl.cloneNode(true),
					urlIndices: [],
					occurrences: []
				}
			}
			messageMap.warnings[messageText].urlIndices.push(urlIndex)
			messageMap.warnings[messageText].occurrences.push({
				urlIndex: urlIndex,
				element: warningEl.cloneNode(true)
			})
		})
	})

	// Filter to include messages that appear in 2+ URLs
	// Separate into: common (all URLs) and duplicate (2+ URLs but not all)
	var totalUrls = allResults.urls.length
	var commonErrors = []      // Errors in ALL URLs
	var duplicateErrors = []   // Errors in 2+ URLs but not all
	var commonWarnings = []    // Warnings in ALL URLs
	var duplicateWarnings = [] // Warnings in 2+ URLs but not all

	for (var msgText in messageMap.errors) {
		if (messageMap.errors.hasOwnProperty(msgText)) {
			var msg = messageMap.errors[msgText]
			// Remove duplicates from urlIndices FIRST
			msg.urlIndices = msg.urlIndices.filter(function (value, index, self) {
				return self.indexOf(value) === index
			})
			// Check if it appears in ALL URLs
			if (msg.urlIndices.length === totalUrls) {
				commonErrors.push(msg)
			}
			// Or if it appears in 2+ URLs (but not all)
			else if (msg.urlIndices.length >= 2) {
				duplicateErrors.push(msg)
			}
		}
	}

	for (var msgText in messageMap.warnings) {
		if (messageMap.warnings.hasOwnProperty(msgText)) {
			var msg = messageMap.warnings[msgText]
			// Remove duplicates from urlIndices FIRST
			msg.urlIndices = msg.urlIndices.filter(function (value, index, self) {
				return self.indexOf(value) === index
			})
			// Check if it appears in ALL URLs
			if (msg.urlIndices.length === totalUrls) {
				commonWarnings.push(msg)
			}
			// Or if it appears in 2+ URLs (but not all)
			else if (msg.urlIndices.length >= 2) {
				duplicateWarnings.push(msg)
			}
		}
	}

	return {
		common: {
			errors: commonErrors,
			warnings: commonWarnings
		},
		duplicate: {
			errors: duplicateErrors,
			warnings: duplicateWarnings
		}
	}
}

/**
 * Extract the message text from an error/warning element
 * Normalizes the text by replacing specific values with placeholders
 */
function extractMessageText(messageEl) {
	var messageClone = messageEl.cloneNode(true)
	var messagePara = messageClone.querySelector('p')
	if (!messagePara) return null

	var messageSpan = messagePara.querySelector('span')
	if (!messageSpan) return null

	// Clone the span to normalize it
	var normalizedSpan = messageSpan.cloneNode(true)

	// Replace all <code> content with placeholder to group similar messages
	var codeElements = normalizedSpan.querySelectorAll('code')
	for (var i = 0; i < codeElements.length; i++) {
		codeElements[i].textContent = '___'
		// Remove href from links inside code
		if (codeElements[i].parentNode instanceof HTMLAnchorElement) {
			codeElements[i].parentNode.removeAttribute('href')
		}
	}

	return normalizedSpan.textContent.trim()
}

/**
 * Hide duplicate errors in individual URL results (warnings are not hidden)
 */
function hideDuplicateMessagesInUrls(duplicateMessages, allResults) {
	// Only hide errors, not warnings
	var allCommonErrors = duplicateMessages.common.errors
	var allDuplicateErrors = duplicateMessages.duplicate.errors
	var allErrors = allCommonErrors.concat(allDuplicateErrors)

	allErrors.forEach(function (dupMsg) {
		dupMsg.urlIndices.forEach(function (urlIndex) {
			var urlSection = document.getElementById('url-' + urlIndex)
			if (!urlSection) return

			// Find all errors in this URL that match the duplicate error
			var errors = urlSection.querySelectorAll('.error')
			errors.forEach(function (msgEl) {
				var msgText = extractMessageText(msgEl)
				if (msgText === dupMsg.text) {
					// Add a special class to mark as duplicate
					if (!msgEl.classList.contains('duplicate-hidden')) {
						msgEl.classList.add('duplicate-hidden')
						msgEl.classList.add('hidden')
					}
				}
			})
		})
	})

	// Update URL counts after hiding duplicates
	updateUrlCounts()
}

/**
 * Show all messages in individual URL results (unhide duplicates)
 */
function showAllMessagesInUrls(duplicateMessages, allResults) {
	// Simply remove all duplicate-hidden classes from all URL sections
	allResults.urls.forEach(function (urlResult, urlIndex) {
		var urlSection = document.getElementById('url-' + urlIndex)
		if (!urlSection) return

		// Find all messages marked as duplicate-hidden
		var messages = urlSection.querySelectorAll('.duplicate-hidden')
		messages.forEach(function (msgEl) {
			msgEl.classList.remove('duplicate-hidden')
			msgEl.classList.remove('hidden')
		})
	})

	// Update URL counts after showing duplicates
	updateUrlCounts()
}

/**
 * Update the error/warning counts in URL headers
 */
function updateUrlCounts() {
	var urlSections = document.querySelectorAll('.url-result-section')
	urlSections.forEach(function (urlSection, index) {
		var countText = urlSection.querySelector('.count-text')
		if (!countText) return

		// Count visible errors and warnings
		var visibleErrors = urlSection.querySelectorAll('.error:not(.hidden)')
		var visibleWarnings = urlSection.querySelectorAll('.warning:not(.hidden)')

		var errorCount = visibleErrors.length
		var warningCount = visibleWarnings.length

		countText.textContent = '(' + errorCount + ' error(s), ' + warningCount + ' warning(s))'
	})
}

/**
 * Create a list item for a duplicate message
 */
function createDuplicateMessageItem(dupMsg, allResults, messageType) {
	var listItem = createHtmlElement('li')
	listItem.className = 'duplicate-message-item'
	listItem.style.marginBottom = '15px'
	listItem.style.padding = '10px'
	listItem.style.backgroundColor = '#fff'
	listItem.style.border = '1px solid #ddd'
	listItem.style.borderRadius = '3px'

	// Create header with toggle button
	var headerDiv = createHtmlElement('div')
	headerDiv.style.display = 'flex'
	headerDiv.style.alignItems = 'flex-start'
	headerDiv.style.cursor = 'pointer'
	headerDiv.style.marginBottom = '10px'
	headerDiv.style.padding = '5px'
	headerDiv.style.borderRadius = '3px'
	headerDiv.style.transition = 'background-color 0.2s'

	// Add hover effect
	headerDiv.onmouseenter = function () {
		headerDiv.style.backgroundColor = '#f5f5f5'
	}
	headerDiv.onmouseleave = function () {
		headerDiv.style.backgroundColor = 'transparent'
	}

	// Toggle icon
	var toggleIcon = createHtmlElement('span')
	toggleIcon.textContent = '▶ '
	toggleIcon.style.marginRight = '8px'
	toggleIcon.style.fontSize = '0.8em'
	toggleIcon.style.color = '#666'
	toggleIcon.style.transition = 'transform 0.2s'
	toggleIcon.style.display = 'inline-block'
	headerDiv.appendChild(toggleIcon)

	// Get the original message span with full formatting
	var originalMessageEl = dupMsg.fullElement.querySelector('p span')
	if (originalMessageEl) {
		var messageContent = createHtmlElement('div')
		messageContent.className = 'duplicate-message-content'
		messageContent.style.flex = '1'
		messageContent.appendChild(originalMessageEl.cloneNode(true))

		// Add URL count badge
		var urlCountBadge = createHtmlElement('span')
		urlCountBadge.textContent = ' (' + dupMsg.urlIndices.length + ' URL' + (dupMsg.urlIndices.length > 1 ? 's' : '') + ')'
		urlCountBadge.style.fontSize = '0.85em'
		urlCountBadge.style.color = '#666'
		urlCountBadge.style.fontWeight = 'normal'
		urlCountBadge.style.marginLeft = '8px'
		messageContent.appendChild(urlCountBadge)

		headerDiv.appendChild(messageContent)
	}

	listItem.appendChild(headerDiv)

	// Create details container (initially hidden)
	var detailsContainer = createHtmlElement('div')
	detailsContainer.className = 'duplicate-details'
	detailsContainer.style.display = 'none'
	detailsContainer.style.marginTop = '10px'
	detailsContainer.style.paddingLeft = '20px'
	detailsContainer.style.borderLeft = '3px solid #e0e0e0'

	// Add URL list heading
	var urlListHeading = createHtmlElement('div')
	urlListHeading.style.fontWeight = 'bold'
	urlListHeading.style.marginBottom = '8px'
	urlListHeading.style.color = '#555'
	urlListHeading.textContent = 'Appears in ' + dupMsg.urlIndices.length + ' URL(s):'
	detailsContainer.appendChild(urlListHeading)

	var urlList = createHtmlElement('ul')
	urlList.style.marginTop = '5px'
	urlList.style.marginBottom = '0'

	dupMsg.urlIndices.forEach(function (urlIndex) {
		// Get all occurrences for this URL
		var urlOccurrences = dupMsg.occurrences.filter(function (occ) {
			return occ.urlIndex === urlIndex
		})

		urlOccurrences.forEach(function (occurrence, occIndex) {
			var urlItem = createHtmlElement('li')
			urlItem.style.marginBottom = '15px'

			// URL link and location info container
			var urlInfoDiv = createHtmlElement('div')
			urlInfoDiv.style.marginBottom = '8px'

			var urlLink = createHtmlElement('a')
			urlLink.href = '#url-' + urlIndex
			urlLink.textContent = 'URL ' + (urlIndex + 1) + ': ' + allResults.urls[urlIndex].url
			urlLink.onclick = function (e) {
				e.preventDefault()
				scrollToUrlSection(urlIndex)
			}
			urlInfoDiv.appendChild(urlLink)

			// Extract line and column information from the occurrence element
			var locationInfo = extractLocationInfo(occurrence.element)
			if (locationInfo) {
				var locationSpan = createHtmlElement('span')
				locationSpan.style.marginLeft = '10px'
				locationSpan.style.fontSize = '0.9em'

				// If there's a source link, create a clickable link
				if (locationInfo.href) {
					var sourceLink = createHtmlElement('a')
					sourceLink.href = locationInfo.href
					sourceLink.textContent = locationInfo.text
					sourceLink.onclick = function (e) {
						e.preventDefault()
						scrollToUrlSectionAndSource(urlIndex, locationInfo.href)
					}
					locationSpan.appendChild(sourceLink)
				} else {
					// No source link, just display text
					locationSpan.textContent = locationInfo.text
				}

				urlInfoDiv.appendChild(locationSpan)
			}

			urlItem.appendChild(urlInfoDiv)

			// Add extract (code snippet) specific to this occurrence
			var occurrenceExtract = occurrence.element.querySelector('p.extract')
			if (occurrenceExtract) {
				var extractClone = occurrenceExtract.cloneNode(true)
				extractClone.style.marginLeft = '0'
				extractClone.style.fontSize = '0.9em'
				urlItem.appendChild(extractClone)
			}

			urlList.appendChild(urlItem)
		})
	})

	detailsContainer.appendChild(urlList)
	listItem.appendChild(detailsContainer)

	// Add toggle functionality
	headerDiv.onclick = function () {
		var isExpanded = detailsContainer.style.display !== 'none'
		if (isExpanded) {
			// Collapse
			detailsContainer.style.display = 'none'
			toggleIcon.textContent = '▶ '
			toggleIcon.style.transform = 'rotate(0deg)'
		} else {
			// Expand
			detailsContainer.style.display = 'block'
			toggleIcon.textContent = '▼ '
			toggleIcon.style.transform = 'rotate(0deg)'
		}
	}

	return listItem
}

/**
 * Scroll to a URL section in multi-URL results
 * @param {number} urlIndex - The index of the URL section to scroll to
 */
function scrollToUrlSection(urlIndex) {
	var urlSection = document.querySelectorAll('.url-result-section')[urlIndex]
	if (urlSection) {
		urlSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
		// Highlight the section briefly
		highlightElement(urlSection, 2000)
	}
}

/**
 * Scroll to a URL section and then to a specific source line
 * @param {number} urlIndex - The index of the URL section
 * @param {string} sourceHref - The href to the source line (e.g., "#l10c5")
 */
function scrollToUrlSectionAndSource(urlIndex, sourceHref) {
	var urlSection = document.querySelectorAll('.url-result-section')[urlIndex]
	if (!urlSection) return

	// Check if the results content is collapsed and expand it if needed
	var resultsContent = urlSection.querySelector('.url-results-content')
	var toggleIcon = urlSection.querySelector('.toggle-icon')

	if (resultsContent && resultsContent.classList.contains('collapsed')) {
		// Expand the section
		resultsContent.classList.remove('collapsed')
		if (toggleIcon) {
			toggleIcon.textContent = '▼'
		}
	}

	// Scroll to URL section first
	urlSection.scrollIntoView({ behavior: 'smooth', block: 'start' })

	// Then try to scroll to the specific source line
	setTimeout(function () {
		var sourceElement = urlSection.querySelector(sourceHref)
		if (sourceElement) {
			sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
			// Use the existing updateFragmentIdHilite by updating the hash
			// This ensures consistent highlighting behavior
			var oldHash = window.location.hash
			window.location.hash = sourceHref
			// Restore hash after a moment to avoid affecting browser history too much
			setTimeout(function () {
				if (window.location.hash === sourceHref) {
					// Keep the hash, updateFragmentIdHilite will handle the styling
				}
			}, 100)
		}
	}, 500)
}

/**
 * Highlight an element temporarily
 * @param {HTMLElement} element - The element to highlight
 * @param {number} duration - Duration in milliseconds
 */
function highlightElement(element, duration) {
	var originalBg = element.style.backgroundColor
	element.style.backgroundColor = '#ffffcc'
	setTimeout(function () {
		element.style.backgroundColor = originalBg
	}, duration)
}

/**
 * Extract location information (line/column) from an error/warning element
 * Returns an object with text and optional href for linking to source
 */
function extractLocationInfo(messageEl) {
	// Look for all <p> elements in the message
	var paragraphs = messageEl.querySelectorAll('p')

	for (var i = 0; i < paragraphs.length; i++) {
		var p = paragraphs[i]
		var text = p.textContent ?? p.innerText

		// Look for patterns like "From line X, column Y; to line Z, column W"
		// or "At line X, column Y"
		if (text.indexOf('From line') !== -1 || text.indexOf('At line') !== -1 || text.indexOf('On line') !== -1) {
			// Check if there's a link inside this paragraph
			var link = p.querySelector('a')
			if (link && link.href) {
				// Extract the hash fragment from the link
				var href = link.getAttribute('href')
				return {
					text: text.trim(),
					href: href
				}
			}
			return {
				text: text.trim(),
				href: null
			}
		}
	}

	return null
}

function displayMultiUrlResults(allResults, resultsDiv) {
	resultsDiv.innerHTML = ''

	// Count total errors and warnings
	var totalErrors = 0
	var totalWarnings = 0
	var hasErrors = false

	allResults.urls.forEach(function (urlResult) {
		if (urlResult.results) {
			var errors = urlResult.results.querySelectorAll('.error')
			var warnings = urlResult.results.querySelectorAll('.warning')
			totalErrors += errors.length
			totalWarnings += warnings.length
			if (errors.length > 0) hasErrors = true
		}
		if (urlResult.error) hasErrors = true
	})

	// Display overall status
	var overallStatus = createHtmlElement('h2')
	overallStatus.id = 'multi-url-overall-status'
	overallStatus.setAttribute('data-total-urls', allResults.total)
	overallStatus.setAttribute('data-total-errors', totalErrors)
	overallStatus.setAttribute('data-total-warnings', totalWarnings)
	if (hasErrors) {
		overallStatus.className = 'failure'
		overallStatus.textContent = 'Validation completed for ' + allResults.total + ' URL(s). Found ' + totalErrors + ' error(s) and ' + totalWarnings + ' warning(s).'
	} else {
		overallStatus.className = 'success'
		overallStatus.textContent = 'Validation completed for ' + allResults.total + ' URL(s). No errors found.'
	}
	resultsDiv.appendChild(overallStatus)

	// Get checkbox state from form (user selected before validation)
	var duplicateCheckbox = document.getElementById('showduplicates')
	var showDuplicatesSection = duplicateCheckbox ? duplicateCheckbox.checked : false

	// Only create duplicate section if there are 2 or more URLs
	var duplicateSection = null
	var duplicateMessages = null

	if (allResults.urls.length >= 2) {
		// Detect duplicate errors/warnings across URLs
		duplicateMessages = findDuplicateMessages(allResults)

		// Create duplicate section container
		duplicateSection = createHtmlElement('div')
		duplicateSection.id = 'duplicate-messages-section'
		duplicateSection.className = 'error'
		duplicateSection.style.marginTop = '20px'
		duplicateSection.style.marginBottom = '30px'

		// Initially hide if checkbox is not checked
		if (!showDuplicatesSection) {
			duplicateSection.style.display = 'none'
		}

		// Calculate total shared errors
		var totalSharedErrors = duplicateMessages.common.errors.length + duplicateMessages.duplicate.errors.length

		var mainHeading = createHtmlElement('h3')
		mainHeading.textContent = 'Shared Errors Across URLs (' + totalSharedErrors + ' errors)'
		mainHeading.style.marginTop = '0'
		mainHeading.style.color = '#e65100'
		duplicateSection.appendChild(mainHeading)

		// Section 1: Common Errors (in ALL URLs) - Only show errors, not warnings
		var hasCommonErrors = duplicateMessages.common.errors.length > 0
		if (hasCommonErrors) {
			var commonSection = createHtmlElement('div')
			commonSection.style.padding = '15px'
			commonSection.style.marginBottom = '20px'
			commonSection.style.border = '2px solid #d32f2f'
			commonSection.style.borderRadius = '5px'
			commonSection.style.backgroundColor = '#ffebee'

			var commonHeading = createHtmlElement('h4')
			commonHeading.textContent = '🔴 Errors in All URLs (' + duplicateMessages.common.errors.length + ' errors)'
			commonHeading.style.marginTop = '0'
			commonHeading.style.color = '#b71c1c'
			commonSection.appendChild(commonHeading)

			var commonDescription = createHtmlElement('p')
			commonDescription.textContent = 'These errors appear in ALL ' + allResults.urls.length + ' validated URLs. Fix these first for maximum impact across all pages.'
			commonDescription.style.fontStyle = 'italic'
			commonDescription.style.marginBottom = '15px'
			commonSection.appendChild(commonDescription)

			// Display common errors only
			var commonErrorsList = createHtmlElement('ol')
			commonErrorsList.className = 'common-messages-list'
			duplicateMessages.common.errors.forEach(function (dupMsg) {
				var listItem = createDuplicateMessageItem(dupMsg, allResults, 'error')
				commonErrorsList.appendChild(listItem)
			})
			commonSection.appendChild(commonErrorsList)

			duplicateSection.appendChild(commonSection)
		}

		// Section 2: Partial Errors (in 2+ URLs but not all) - Only show errors, not warnings
		var hasPartialErrors = duplicateMessages.duplicate.errors.length > 0
		if (hasPartialErrors) {
			var partialDuplicateSection = createHtmlElement('div')
			partialDuplicateSection.style.padding = '15px'
			partialDuplicateSection.style.border = '2px solid #ff9800'
			partialDuplicateSection.style.borderRadius = '5px'
			partialDuplicateSection.style.backgroundColor = '#fff3e0'

			var partialHeading = createHtmlElement('h4')
			partialHeading.textContent = '🟠 Errors in Some URLs (' + duplicateMessages.duplicate.errors.length + ' errors)'
			partialHeading.style.marginTop = '0'
			partialHeading.style.color = '#e65100'
			partialDuplicateSection.appendChild(partialHeading)

			var partialDescription = createHtmlElement('p')
			partialDescription.textContent = 'These errors appear in 2 or more URLs, but not in all of them. Click on each error to see which specific URLs contain it.'
			partialDescription.style.fontStyle = 'italic'
			partialDescription.style.marginBottom = '15px'
			partialDuplicateSection.appendChild(partialDescription)

			// Display partial errors only
			var errorsList = createHtmlElement('ol')
			errorsList.className = 'duplicate-messages-list'
			duplicateMessages.duplicate.errors.forEach(function (dupMsg) {
				var listItem = createDuplicateMessageItem(dupMsg, allResults, 'error')
				errorsList.appendChild(listItem)
			})
			partialDuplicateSection.appendChild(errorsList)

			duplicateSection.appendChild(partialDuplicateSection)
		}

		// If no shared errors at all
		if (!hasCommonErrors && !hasPartialErrors) {
			var noSharedErrors = createHtmlElement('p')
			noSharedErrors.textContent = '✅ No shared errors found across the validated URLs. Each URL has unique errors only.'
			noSharedErrors.style.fontStyle = 'italic'
			noSharedErrors.style.padding = '15px'
			noSharedErrors.style.border = '2px solid #4caf50'
			noSharedErrors.style.borderRadius = '5px'
			noSharedErrors.style.backgroundColor = '#e8f5e9'
			duplicateSection.appendChild(noSharedErrors)
		}

		// Add event listener to checkbox in form to toggle duplicate section and messages
		if (duplicateCheckbox) {
			duplicateCheckbox.addEventListener('change', function (e) {
				if (e.target.checked) {
					duplicateSection.style.display = 'block'
					// Hide duplicate messages in individual URL results
					hideDuplicateMessagesInUrls(duplicateMessages, allResults)
					if (supportsLocalStorage()) {
						localStorage['showDuplicates'] = 'yes'
					}
				} else {
					duplicateSection.style.display = 'none'
					// Show all messages in individual URL results
					showAllMessagesInUrls(duplicateMessages, allResults)
					if (supportsLocalStorage()) {
						localStorage['showDuplicates'] = 'no'
					}
				}
				// Update counts after toggling
				showCount()
			}, false)
		}
	} // End of if (allResults.urls.length >= 2)

	// Create container for all URL results
	var urlResultsContainer = createHtmlElement('div')
	urlResultsContainer.id = 'multi-url-results'
	urlResultsContainer.style.marginTop = '20px'

	// Display results for each URL
	allResults.urls.forEach(function (urlResult, index) {
		var urlSection = createHtmlElement('div')
		urlSection.className = 'url-result-section'
		urlSection.id = 'url-' + index

		// URL header with toggle
		var urlHeader = createHtmlElement('div')
		urlHeader.className = 'url-header'

		var toggleIcon = createHtmlElement('span')
		toggleIcon.className = 'toggle-icon'
		toggleIcon.textContent = '▼'

		var urlText = createHtmlElement('span')
		urlText.className = 'url-text'
		urlText.textContent = ' URL ' + (index + 1) + ': ' + urlResult.url

		// Count errors and warnings for this URL
		var errorCount = 0
		var warningCount = 0
		if (urlResult.results) {
			errorCount = urlResult.results.querySelectorAll('.error').length
			warningCount = urlResult.results.querySelectorAll('.warning').length
		}

		var countText = createHtmlElement('span')
		countText.className = 'count-text'
		if (urlResult.error) {
			countText.textContent = '(Error: ' + urlResult.error + ')'
			countText.className += ' error'
		} else {
			countText.textContent = '(' + errorCount + ' error(s), ' + warningCount + ' warning(s))'
		}

		urlHeader.appendChild(toggleIcon)
		urlHeader.appendChild(urlText)
		urlHeader.appendChild(countText)

		// Results content (initially collapsed by default)
		var resultsContent = createHtmlElement('div')
		resultsContent.className = 'url-results-content collapsed'

		if (urlResult.error) {
			var errorMsg = createHtmlElement('p')
			errorMsg.style.color = '#f00'
			errorMsg.style.padding = '10px'
			errorMsg.textContent = 'Failed to validate: ' + urlResult.error
			resultsContent.appendChild(errorMsg)
		} else {
			// Errors/Warnings Section
			var messagesSection = createHtmlElement('div')
			messagesSection.className = 'messages-section'

			if (urlResult.status) {
				messagesSection.appendChild(urlResult.status)
			}
			if (urlResult.results) {
				messagesSection.appendChild(urlResult.results)
			} else {
				var noResults = createHtmlElement('p')
				noResults.textContent = 'No validation results available.'
				messagesSection.appendChild(noResults)
			}

			resultsContent.appendChild(messagesSection)

			// Source Code Section
			if (urlResult.sourceHeading && urlResult.sourceList) {
				var sourceSection = createHtmlElement('div')
				sourceSection.className = 'source-section'
				sourceSection.style.marginTop = '20px'
				sourceSection.style.borderTop = '2px solid #ccc'
				sourceSection.style.paddingTop = '15px'

				sourceSection.appendChild(urlResult.sourceHeading)
				sourceSection.appendChild(urlResult.sourceList)

				resultsContent.appendChild(sourceSection)
			}
		}

		// Toggle functionality
		urlHeader.onclick = function () {
			// Check current state from DOM instead of relying on a variable
			var isCurrentlyExpanded = !resultsContent.classList.contains('collapsed')

			if (isCurrentlyExpanded) {
				// Currently expanded, so collapse it
				resultsContent.classList.add('collapsed')
				toggleIcon.textContent = '▶'
				toggleIcon.style.transform = 'rotate(0deg)'
			} else {
				// Currently collapsed, so expand it
				resultsContent.classList.remove('collapsed')
				toggleIcon.textContent = '▼'
				toggleIcon.style.transform = 'rotate(0deg)'
			}
		}

		urlSection.appendChild(urlHeader)
		urlSection.appendChild(resultsContent)
		urlResultsContainer.appendChild(urlSection)
	})

	resultsDiv.appendChild(urlResultsContainer)

	// Append duplicate section after multi-url-results (only if it exists, i.e., >= 2 URLs)
	if (duplicateSection) {
		resultsDiv.appendChild(duplicateSection)

		// If checkbox is checked initially, hide duplicates in individual URL results
		// This must happen AFTER urlResultsContainer is appended to DOM
		if (showDuplicatesSection && duplicateMessages) {
			hideDuplicateMessagesInUrls(duplicateMessages, allResults)
		}
	}

	// Re-initialize filters and other UI enhancements
	setTimeout(function () {
		initFilters()
		injectHyperlinks()
		moveLangAndDirWarningsAndAddLinks()
		replaceSuccessFailure()
		attachSourceLinkHandlers()
	}, 100)
}

/**
 * Attach click handlers to source line links in multi-URL results
 * to ensure the URL section is expanded before scrolling
 */
function attachSourceLinkHandlers() {
	var multiUrlContainer = document.getElementById('multi-url-results')
	if (!multiUrlContainer) return

	// Find all URL sections
	var urlSections = multiUrlContainer.querySelectorAll('.url-result-section')

	urlSections.forEach(function (urlSection, urlIndex) {
		// Find all links to source lines within this URL section's messages
		var messagesSection = urlSection.querySelector('.messages-section')
		if (!messagesSection) return

		var sourceLinks = messagesSection.querySelectorAll('a[href^="#l"], a[href^="#cl"]')

		sourceLinks.forEach(function (link) {
			link.addEventListener('click', function (e) {
				e.preventDefault()
				var href = link.getAttribute('href')

				// Check if the results content is collapsed and expand it if needed
				var resultsContent = urlSection.querySelector('.url-results-content')
				var toggleIcon = urlSection.querySelector('.toggle-icon')

				if (resultsContent && resultsContent.classList.contains('collapsed')) {
					// Expand the section
					resultsContent.classList.remove('collapsed')
					if (toggleIcon) {
						toggleIcon.textContent = '▼'
					}
				}

				// Wait a moment for the expansion animation, then scroll
				setTimeout(function () {
					var sourceElement = urlSection.querySelector(href)
					if (sourceElement) {
						sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
						// Update the hash to trigger highlighting
						window.location.hash = href
					}
				}, 100)
			})
		})
	})
}
