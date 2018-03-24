/**
 * TempusTools/js/background.js
 *
 * Background processor for TempusTools
 * 
 * Handles various tasks including:
 * - adding the outgoing header
 * - adding a listener for message from devtools to run console log on
 * - inline script
 *
 * @version 1.1
 *
 * @author Aaron Saray aaron@aaronsaray.com
 *
 * - Rewritten for specialized application by:
 * 
 * @author Joey Kimsey joeyk4816@gmail.com
 *
 * @link    https://TheTempusProject.com/TempusTools
 *
 * @license https://opensource.org/licenses/MIT [MIT LICENSE]
 */

/**
* set up a quick namespace as not to pollute
*/
var TempusTools = TempusTools || {};

/**
 * Define to send headers
 */
TempusTools.addHeaders = true;

/**
 * Max combined header size of 256kb
 */
TempusTools.maxCombinedSize = 261120;

/**
 * Whether the plugin is enabled
 */
TempusTools.enabled = true;

/**
 * Function to show in the browser action and text whether this is enabled or not
 */
TempusTools.showExtensionEnabled = function()
{
    if (TempusTools.enabled) {
        chrome.browserAction.setTitle({"title":"Disable TempusTools"});
        chrome.browserAction.setIcon({path:"images/icon_128.png"});
    }
    else {
        chrome.browserAction.setTitle({"title":"Enable TempusTools"});
        chrome.browserAction.setIcon({path:"images/icon_greyscale_128.png"});
    }
};

/**
 * get options, then add a listener once i've got them
 */
chrome.storage.sync.get(['options', 'enabled'], function(settings) {
    if (settings.options) {
        if (settings.options.hasOwnProperty('securityHash')) {
            TempusTools.securityHash = settings.options.securityHash;
        }
        if (settings.options.hasOwnProperty('maxCombinedSize')) {
            TempusTools.maxCombinedSize = settings.options.maxCombinedSize;
        }
    }
    if (settings.hasOwnProperty('enabled')) {
        TempusTools.enabled = settings.enabled;
        TempusTools.showExtensionEnabled();
    }
});

/**
 * On header send, add in the header for TempusTools and 256k limit for chrome header size
 * note: it has to go here, not in devtools.js because devtools only gets called when you show it
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details) {
        if (TempusTools.addHeaders && TempusTools.enabled) {
            for (var i = 0; i < details.requestHeaders.length; i++) {
                if (details.requestHeaders[i].name == 'User-Agent') {
                    details.requestHeaders[i].value += ' TempusTools/Debugger'; // required for old ZF and other libs (matches the regex)
                }
            }
            details.requestHeaders.push({
                    name:	'X-TempusDebugger-Version',
                    value:	'1.1'
                },
                {
                    name:   'X-TempusDebugger-MaX-Combined-Size',
                    value:  TempusTools.maxCombinedSize+''
                },
                {
                    name:   'X-TempusDebugger-securityHash',
                    value:  TempusTools.securityHash+''
                });
        }

		return {
			requestHeaders: details.requestHeaders
		};
	}, {urls: ["<all_urls>"]}, ['blocking', 'requestHeaders']	
);

/**
 * Code used to inject inline.  into the current page to run
 */
const LOGGER = function (json, enabled) {
    if (enabled) {
        var commandObject = JSON.parse(unescape(json));
        console[commandObject.type].apply(console, commandObject.params);
    }
};

/** 
 * messages come from devtools in the form of an object with a type of console log an a message to send
 * all escaped and jsonified
 */
chrome.extension.onMessage.addListener(
	function(commandObject) {
		//inject LOGGER code and pass argument of our escaped stringified object
		chrome.tabs.executeScript(null, {
			 code: "("+ LOGGER + ")('" + commandObject + "', " + TempusTools.enabled + ");"
		});
	}	
);

/**
 * Define the click handler for the badge to handle disable/enable
 */
chrome.browserAction.onClicked.addListener(function(tab){
    TempusTools.enabled = !TempusTools.enabled;
    chrome.storage.sync.set({'enabled': TempusTools.enabled}, function() {
        TempusTools.showExtensionEnabled();
    });
});