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
            var media = new this.Media();
            if (media.initialize(url)) {
                var thumbnail = $('<img src="' + media.item.getThumbnailUrl() + '" class="burro-thumbnail" />');
                $(link).prepend(thumbnail);

                $(thumbnail).on('mouseover',  function (e) {
                    var img = new Image();

                    // After the thumbnail has loaded, grab its width/height and set the full sized popver using that width/height
                    img.onload = function() {
                        // What is the position of the thumbnail on the page
                        var top = (e.target.offsetTop + e.target.height);
                        var left = (e.target.offsetLeft + e.target.width);
                        var maxWidth = (window.innerWidth - left - 10);
                        var maxHeight = (window.innerHeight - top - 30 + document.body.scrollTop);

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

                        // Construct the DOM object/HTML for the popover
                        var popover = $(media.item.getHtml()).appendTo('body');
                        popover.addClass('burro-image');
                        popover.css({
                            position: "absolute",
                            top: top,
                            left: left,
                            width: this.width,
                            height: this.height
                        });
                    }

                    img.src = media.item.getThumbnailUrl(url);
                }.bind(this));

                // Remove the full sized image/video when we mouseout
                $(thumbnail).on('mouseout', function (e) {
                    $('.burro-image').remove();
                });
            }
        }.bind(this));

        // Remove the full sized image/video when we click anywhere on the page
        $('body').on('click', function (e) {
            $('.burro-image').remove();
        });
    };

    /**
     * The Media class
     */
    this.Media = function() {

        var item = null;

        /**
         * Construct the class
         *
         * @param string url The url
         *
         * @return boolean
         */
        this.initialize = function (url) {
            var img = new this.Image();
            if (img.isValid(url)) {
                img.initialize(url);
                this.item = img;
                return true;
            }

            var vid = new this.Video();
            if (vid.isValid(url)) {
                vid.initialize(url);
                this.item = vid;
                return true;
            }

            return false;
        }

        /**
         * The Image class
         */
        this.Image = function() {

            var url = null;

            /**
             * Construct the class
             */
            this.initialize = function(url) {
                this.url = url;
            }

            /**
             * Get the thumbnail url
             *
             * @return string
             */
            this.getThumbnailUrl = function () {
                return this.url;
            }

            /**
             * Get the HTML
             *
             * @return string
             */
            this.getHtml = function () {
                return '<img src="' + this.url + '" />';
            }

            /**
             * Does the url point to a valid image?
             *
             * @param string url The url
             *
             * @return boolean
             */
            this.isValid = function (url) {
                return (
                    url.match(/i.imgur.com/) ||
                    url.match(/\.gif$/i) ||
                    url.match(/\.jpg$/i) ||
                    url.match(/\.png$/i)
                );
            }
        }

        /**
         * The Video class
         */
        this.Video = function() {

            var url = null;

            /**
             * Construct the class
             */
            this.initialize = function(url) {
                this.url = this.sanitizeUrl(url);
            }

            /**
             * Get the thumbnail url
             *
             * @return string
             */
            this.getThumbnailUrl = function () {
                return this.url.replace(/\/\//, '//thumbs.').replace(/$/, '-poster.jpg');
            }

            /**
             * Get the HTML
             *
             * @return string
             */
            this.getHtml = function () {
                return '<video autoplay loop muted poster="' + this.getThumbnailUrl() + '">' +
                            '<source src="' + this.url.replace(/\/\//, '//fat.').replace(/$/, '.webm') + '" type="video/webm">' +
                            '<source src="' + this.url.replace(/\/\//, '//zippy.').replace(/$/, '.webm') + '" type="video/webm">' +
                        '</video>';
            }

            /**
             * Does the url point to a valid video?
             *
             * @param string url The url
             *
             * @return boolean
             */
            this.isValid = function (url) {
                return url.match(/gfycat.com/i);
            }

            /**
             * Sanitize a url
             *
             * @param string url The url
             *
             * @return string
             */
            this.sanitizeUrl = function (url) {
                return url.replace(/#.*$/, '').replace(/www\./, '');
            }
        }
    }
}
