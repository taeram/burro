// SAMPLE
this.manifest = {
    "name": "My Extension",
    "icon": "icon.png",
    "settings": [
        {
            "tab": i18n.get("information"),
            "group": i18n.get("features"),
            "name": "fixed_header",
            "type": "checkbox",
            "label": i18n.get("fixed_header")
        },
        {
            "tab": i18n.get("information"),
            "group": i18n.get("features"),
            "name": "mark_as_read",
            "type": "checkbox",
            "label": i18n.get("mark_as_read")
        },
        {
            "tab": i18n.get("information"),
            "group": i18n.get("features"),
            "name": "burro_style",
            "type": "checkbox",
            "label": i18n.get("burro_style")
        }
    ]
};
