// Start the script once the page is loaded
chrome.extension.sendMessage({module: "page", action: "is_loaded"}, function(response) {
    var readyStateCheckInterval = setInterval(function() {
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);

            // Get the extension settings
            chrome.extension.sendMessage({module: "storage", action: "get"}, function (localStorage) {
                // Initialize Mark as Read?
                if (localStorage['store.settings.mark_as_read'] == "true") {
                    var markAsReadOnNext = (localStorage['store.settings.mark_as_read_on_next'] == "true");
                    var mar = new MarkAsRead();
                    mar.initialize(markAsReadOnNext);

                }

                // Initialize Burro Style?
                if (localStorage['store.settings.burro_style'] == "true") {
                    var bs = new BurroStyle();
                    bs.initialize();
                }

                // Enable the fixed header?
                if (localStorage['store.settings.burro_style'] == "true") {
                    var fh = new FixedHeader();
                    fh.initialize();
                }

                // Enable view all images?
                if (localStorage['store.settings.view_all_images'] == "true") {
                    var via = new ViewAllImages();
                    via.initialize();
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
    this.initialize = function (markAsReadOnNext) {
        // Add the "Mark All as Read" link
        var markAllAsReadLink = $('<li><a href="http://reddit.com">mark all as read</a></li>').appendTo('.tabmenu');
        $(markAllAsReadLink).on('click', function (e) {
            e.preventDefault();
            this.markAllRead(e);
        }.bind(this));

        // Add mark as read checkmarks to all individual links
        $('.content .sitetable a.title').each(function (i, link) {
            var checkmark = $('<button class="burro-mark-as-read">&#10004;</button>').prependTo($(link).parent());
            $(checkmark).on('click', this.onClickCheckmark.bind(this));
        }.bind(this));

        // Mark all as read on click "next" link at bottom of page
        if (markAsReadOnNext) {
            $('.nav-buttons a[rel~="next"]').first().on('click', this.markAllRead.bind(this));
        }
    };

    this.markAllRead = function (e) {
        $('.content .sitetable a.title').each(function (i, link) {
            var url = $(link).attr('href');
            this.markAsRead(url);
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
function BurroStyle() {
    /**
     * Setup the module
     */
    this.initialize = function () {
        $('body').addClass('burro-style');
    };
}


/**
 * The Fixed Header module
 */
function FixedHeader() {
    /**
     * Setup the module
     */
    this.initialize = function () {
        $('body').addClass('burro-fixed-header');
    };
}

/**
 * The View All Images module
 */
function ViewAllImages() {
    /**
     * Setup the module
     */
    this.initialize = function () {
        $('.content .sitetable a.title').each(function (i, link) {
            var url = $(link).attr('href');
            if (this.isImage(url)) {
                var thumbnail = $('<img src="' + url + '" class="burro-thumbnail" />');
                $(link).prepend(thumbnail);

                $(thumbnail).on('mouseover', function (e) {
                    var img = new Image();
                    img.onload = function() {
                        var top = (e.target.offsetTop + e.target.height);
                        var left = (e.target.offsetLeft + e.target.width);
                        var maxWidth = (window.innerWidth - left - 10);
                        var maxHeight = (window.innerHeight - top - 10 + document.body.scrollTop);

                        // Constrain the width
                        if (this.width > maxWidth) {
                            var widthRatio = this.width / maxWidth;
                            this.width = maxWidth;
                            this.height /= widthRatio;
                        }

                        // Constrain the height
                        if (this.height > maxHeight) {
                            var heightRatio = this.height / maxHeight;
                            this.height = maxHeight;
                            this.width /= heightRatio;
                        }

                        var img = $('<img src="' + url + '" class="burro-image" />').appendTo('body');
                        img.css({
                            position: "absolute",
                            top: top,
                            left: left,
                            width: this.width,
                            height: this.height
                        });
                    }
                    img.src = url;
                });

                $(thumbnail).on('mouseout', function (e) {
                    $('.burro-image').remove();
                });
            }
        }.bind(this));

        // Remove the image container
        $('body').on('click', function (e) {
            $('.burro-image').remove();
        });
    };

    this.isImage = function (url) {
        return url.match(/i.imgur.com/) ||
            url.match(/\.gif$/i) ||
            url.match(/\.jpg$/i) ||
            url.match(/\.png$/i);
    }
}
