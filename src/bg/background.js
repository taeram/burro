// Open Options after installation
chrome.runtime.onInstalled.addListener(function (object) {
    chrome.tabs.create({url: "src/options_custom/index.html"}, function (tab) {
    });
});

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.module == 'storage' && request.action == 'get') {
        sendResponse(localStorage);
    }

    if (request.module == 'page' && request.action == 'is_loaded') {
        sendResponse();
    }

    if (request.module == 'mark_as_read') {
        if (request.action == 'toggle') {
            chrome.history.getVisits(request.params, function (results) {
                if (results.length > 0) {
                    chrome.history.deleteUrl(request.params);
                } else {
                    chrome.history.addUrl(request.params);
                }
            });
        } else if (request.action == 'add') {
            chrome.history.addUrl(request.params);
        }
    }
});
