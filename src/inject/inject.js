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
                    // Enable hide nsfw images?
                    var hideNsfw = false;
                    if (localStorage['store.settings.view_all_images_hide_nsfw'] == "true") {
                        hideNsfw = true;
                    }

                    var via = new ViewAllImages();
                    via.initialize(hideNsfw);
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

    var SOURCE_GFYCAT = 'gfycat';
    var SOURCE_YOUTUBE = 'youtube';

    /**
     * Setup the module
     */
    this.initialize = function (hideNsfw) {
        $('.content .sitetable a.title').each(function (i, link) {
            // Hide NSFW links?
            var isNsfw = ($(link).parents('.entry').find('.nsfw-stamp').length > 0);
            if (isNsfw && hideNsfw) {
                return;
            }

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
                        var maxWidth = (window.innerWidth - left - 80);
                        var maxHeight = (window.innerHeight + document.body.scrollTop - top - 70);

                        // Construct the DOM object/HTML for the popover
                        var popoverHtml = '<div class="burro-popover"><div class="burro-popover-content">' + media.item.getPopoverHtml(maxWidth, maxHeight) + '</div></div>';
                        var popover = $(popoverHtml).appendTo('body');
                        popover.css({
                            top: top,
                            left: left
                        });
                    }

                    img.src = media.item.getThumbnailUrl(url);
                }.bind(this));

                // Remove the full sized image/video when we mouseout
                $(thumbnail).on('mouseout', function (e) {
                    $('.burro-popover').remove();
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
                if (!img.initialize(url)) {
                    return false;
                }

                this.item = img;
                return true;
            }

            var vid = new this.Video();
            if (vid.isValid(url)) {
                if (!vid.initialize(url)) {
                    return false;
                }

                this.item = vid;
                return true;
            }

            return false;
        }

        /**
         * The Image class
         */
        this.Image = function() {

            var thumbUrl = null;
            var originalUrl = null;

            /**
             * Construct the class
             */
            this.initialize = function(url) {
                // Modify imgur photo albums with only a single photo to point directly to the image url
                if (url.match(/imgur.com/) && !url.match(/i.imgur.com/) && !url.match(/imgur.com\/a\//)) {
                    url = url.replace(/imgur.com/, 'i.imgur.com');
                }

                // Modify imgur urls
                if (url.match(/i.imgur.com/)) {
                    // Always load it over HTTPS
                    if (!url.match(/^https:/)) {
                        url = url.replace(/^http:/, 'https:');
                    }

                    // Handle images without an extension
                    if (!url.match(/\.[a-z]{3,}$/)) {
                        url += '.jpg';
                    }

                    // Load the gifv instead of the slower gif
                    if (url.match(/\.gif$/)) {
                        url += 'v';
                    }

                    this.thumbUrl = this.originalUrl = url;

                    // Modify thumbnail images to point to the small, static thumbnail
                    if (!this.thumbUrl.match(/b\.jpg$/)) {
                        this.thumbUrl = this.thumbUrl.replace(/\.\w+$/, 'b.jpg');
                    }  
                    return true;
                }

                // Modify Vimeo urls to point to the large thumbnail url
                if (url.match(/vimeo.com/)) {
                    var id = null;
                    matches = url.match(/vimeo.com\/(.+)/)
                    if (matches) {
                        id = matches[1];
                    }

                    // Get the thumbnail URL from Vimeo's API
                    $.ajax({
                        url: "http://vimeo.com/api/v2/video/" + id + ".xml",
                        async: false,
                        success: function (xml) {
                            this.thumbUrl = this.originalUrl = $(xml).find('thumbnail_large').text();
                        }.bind(this)
                    });

                    return true;
                }

                // Default
                this.thumbUrl = this.originalUrl = url;
                return true;
            }

            /**
             * Get the thumbnail url
             *
             * @return string
             */
            this.getThumbnailUrl = function () {
                return this.thumbUrl;
            }

            /**
             * Get the HTML
             *
             * @return string
             */
            this.getPopoverHtml = function (width, height) {
                if (this.originalUrl.match(/i.imgur.com/) && this.originalUrl.match(/\.gifv$/)) {
                    var videoUrl = this.originalUrl.replace(/\.gifv$/, '.mp4');
                    return '<video autoplay loop muted poster="' + this.getThumbnailUrl() + '" style="max-width: ' + width + 'px; max-height: ' + height + 'px">' +
                                '<source src="' + videoUrl + '" type="video/mp4">' +
                            '</video>';
                }

                return '<img src="' + this.originalUrl + '" style="max-width: ' + width + 'px; max-height: ' + height + 'px" />';
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
                    // Direct link to an imgur url
                    url.match(/i.imgur.com/) ||

                    // Link to a single imgur image, not an imgur gallery
                    url.match(/imgur.com/) && !url.match(/imgur.com\/a\//)  ||

                    // Vimeo
                    url.match(/vimeo.com/) ||

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
            // The video source
            var source = null;

            // The video id
            var id = null;

            // The video url
            var url = null;

            // The popover html
            var popoverHtml = null;

            /**
             * Construct the class
             */
            this.initialize = function(url) {
                this.url = this.sanitizeUrl(url);

                // Load gfycat urls over HTTPS
                if (this.url.match(/gfycat.com/i)) {
                    this.source = SOURCE_GFYCAT;
                    if (!this.url.match(/^https:/)) {
                        this.url = this.url.replace(/^http:/, 'https:');
                    }
                }

                // Modify YouTube urls to point to the high quality thumbnail url
                if (this.url.match(/youtube.com/i) || this.url.match(/youtu.be/i)) {
                    this.source = SOURCE_YOUTUBE;

                    if (this.url.match(/youtube.com/)) {
                        if (this.url.match('attribution_link')) {
                            this.url = this.url.replace(/%3D/g, '=');
                        }

                        matches = this.url.match(/v=([_\-0-9a-zA-Z]+)/)
                        if (matches) {
                            this.id = matches[1];
                        }
                    }

                    if (this.url.match(/youtu.be/)) {
                        matches = this.url.match(/youtu.be\/([_\-0-9a-zA-Z]+)/)
                        if (matches) {
                            this.id = matches[1];
                        }
                    }

                    if (this.id === null || this.id == '') {
                        return false;
                    }

                    // Preload the video dimensions
                    $.get('https://www.youtube.com/oembed',
                        {
                            'format': 'json',
                            'url': this.url
                        }, function (result) {
                            var html = result.html;

                            // Ensure it's served over HTTPS
                            html = html.replace(/src="http:/, 'src="https:')

                            // Autoplay
                            html = html.replace(/feature=oembed/, 'autoplay=1');

                            this.popoverHtml = html;
                        }.bind(this)
                    );
                }

                return true;
            }

            /**
             * Get the thumbnail url
             *
             * @return string
             */
            this.getThumbnailUrl = function () {
                if (this.source == SOURCE_GFYCAT) {
                    return this.url.replace(/\/\//, '//thumbs.').replace(/$/, '-poster.jpg');
                }

                if (this.source == SOURCE_YOUTUBE) {
                    return "https://i.ytimg.com/vi/" + this.id + "/hqdefault.jpg";
                }

            }

            /**
             * Get the HTML
             *
             * @return string
             */
            this.getPopoverHtml = function (width, height) {
                if (this.source == SOURCE_GFYCAT) {
                    this.popoverHtml = '<video autoplay loop muted poster="' + this.getThumbnailUrl() + '" style="max-width: ' + width + 'px; max-height: ' + height + 'px">' +
                                            '<source src="' + this.url.replace(/\/\//, '//fat.').replace(/$/, '.webm') + '" type="video/webm">' +
                                            '<source src="' + this.url.replace(/\/\//, '//giant.').replace(/$/, '.webm') + '" type="video/webm">' +
                                            '<source src="' + this.url.replace(/\/\//, '//zippy.').replace(/$/, '.webm') + '" type="video/webm">' +
                                        '</video>';
                }

                return this.popoverHtml;
            }

            /**
             * Does the url point to a valid video?
             *
             * @param string url The url
             *
             * @return boolean
             */
            this.isValid = function (url) {
                return (
                    // Gfycat
                    url.match(/gfycat.com/i) ||

                    // Youtube
                    url.match(/youtube.com/i) || url.match(/youtu.be/i)
                );
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
