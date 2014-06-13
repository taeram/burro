// Start the script once the page is loaded
chrome.extension.sendMessage({module: "page", action: "is_loaded"}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            // Get the extension settings
            chrome.extension.sendMessage({module: "storage", action: "get"}, function (localStorage) {
                // Initialize Mark as Read?
                if (localStorage['store.settings.mark_as_read'] == "true") {
                    var mar = new MarkAsRead();
                    mar.initialize();
                }

                // Initialize Burro Style?
                if (localStorage['store.settings.burro_style'] == "true") {
                    var bs = new BurroStyle();
                    bs.initialize();
                }
            });
        }
    }, 10);
});

/**
 * The Mark as Read module
 */
function MarkAsRead() {
    /**
     * Setup the module
     */
    this.initialize = function () {
        // Add the "Mark All as Read" link
        var markAllAsReadLink = $('<li><a href="http://reddit.com">mark all as read</a></li>').appendTo('.tabmenu');
        $(markAllAsReadLink).on('click', function (e) {
            e.preventDefault();
            $('.content .sitetable a.title').each(function (i, link) {
                var url = $(link).attr('href');
                this.markAsRead(url);
            }.bind(this));
        }.bind(this));

        // Add mark as read checkmarks to all individual links
        $('.content .sitetable a.title').each(function (i, link) {
            var checkmark = $('<button class="burro-mark-as-read">&#10004;</button>').prependTo($(link).parent());
            $(checkmark).on('click', this.onClickCheckmark.bind(this));
        }.bind(this));
    };

    /**
     * Convert a relative url to an absolute url
     *
     * @param string url The url
     *
     * @return string
     */
    this.relativeToAbsolute = function (url) {
        if (url.match(/^\//)) {
            url = window.location.origin + url;
        }
        return url;
    };

    /**
     * Triggered when we click a "mark as read" checkmark
     *
     * @param object event The event
     */
    this.onClickCheckmark = function (event) {
        var url = $(event.target).parent().find('a.title').first().attr('href');
        url = this.relativeToAbsolute(url);
        this.toggleRead(url);
    };

    /**
     * Toggle the read status for the selected url
     *
     * @param string url The url
     */
    this.toggleRead = function (url) {
        chrome.runtime.sendMessage({
            module: "mark_as_read",
            action: "toggle",
            params: {
                url: this.relativeToAbsolute(url)
            }
        });
    };

    /**
     * Mark the selected url as read
     *
     * @param string url The url
     */
    this.markAsRead = function (url) {
        chrome.runtime.sendMessage({
            module: "mark_as_read",
            action: "add",
            params: {
                url: this.relativeToAbsolute(url)
            }
        });
    };
}

/**
 * The Burro Style module
 */
function BurroStyle () {
    /**
     * Setup the module
     */
    this.initialize = function () {
        $('body').addClass('burro-style');
    };
}
