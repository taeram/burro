$.noConflict();

window.addEvent("domready", function () {
    new FancySettings.initWithManifest(function (settings) {
    	// If "View All Images" is checked, enable "Hide NSFW Images"
    	jQuery('#view_all_images').on('click', toggleViewAllImages);
    	toggleViewAllImages();
    });

});

function toggleViewAllImages() {
	var isChecked = jQuery('#view_all_images').is(':checked');

	if (isChecked) {
		jQuery('#view_all_images_hide_nsfw').removeAttr('disabled');
	} else {
		jQuery('#view_all_images_hide_nsfw').attr('disabled', true);
	}

}