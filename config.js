module.exports = {
    server: {
        port: 3000,
        paths: {
            source: "./source/",        // Site content, layout templates,
                                        // styles, and client-side scripts.
            public: "./public/",        // Where the project is compiled to.
            sourcePaths: {
                pages: "pages/",        // Pages and their contents.
                templates: "templates/",// Layout template files.
                styles: "styles/",      // SCSS and CSS files.
                scripts: "scripts/",    // Client-side scripts.
                assets: "assets/",      // Images and other assets.
            },
        }
    }
};
