module.exports = {
    server: {
        port: 3000,
        directories: {
            source: "source",       // Site content, layout templates,
                                    // styles, and client-side scripts.
            public: "public",       // Where the project is compiled to.
            pages:  "pages",        // Optional: Specify a custom directory
                                    // for pages in the source directory.
        }
    }
};