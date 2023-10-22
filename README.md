# Zin

## Introduction

Zin provides a streamlined framework for static site generation, emphasizing structured JSON data, EJS templates, and a systematic, template-driven development approach.

### Ethos

- **Minimalism**: Zin maintains a minimum of dependencies and prioritizes rapid development, deployment, and iteration.
- **Uniform Environment**: All content and templates are stored in EJS and the project in general sticks to JS/Node-y ways of doing things, ensuring a uniform development environment that reduces cognitive overhead and maximizes expressiveness.
- **Configurability:** While it provides some starter pages and templates, the structure of your project is up to you via the config file. 
- **Template-Driven Development**: Zin is biased towards storing site content as pure data, emphasizing templates. This structure underscores the DRY (Don't Repeat Yourself) principle and promotes consistent theming.

### Key Functionality

- **Dynamic Templating**: Leverages EJS templates for dynamic content, integrating configurations with templates to produce the final HTML.
- **SASS Compilation**: All `.scss` files in `styles` undergo compilation to `.css` within `public/styles`, with the exception of those prefixed with `_`.
- **Collections**: Organizes pages into collections based on their directory, facilitating content grouping.

## Installing and Running Zin

- **Initialization:** `zin init` sets up a starter structure.
- **Development Mode:** `npm start` launches BrowserSync, monitoring the source directory. On changes:
  - Site rebuilds using `buildSite` in `build.js`.
  - BrowserSync refreshes the view.
- **Building:** `npm run build` creates static assets.

## Usage, Content Creation, and Compilation

- **EJS Page Configuration:** EJS pages start with:
```
<% const config = { /* ...config data... */ }; %>
```

- **Templates:** Stored in the templates directory. Configuration should point to the relevant template.

- **SASS Structure:** Only SASS files not starting with `_` are directly compiled. `_` files are partials or modules.

### Creating an EJS Page

EJS files should follow:

```
<% const config = {
  title: 'Page Title',
  template: 'default',
  // ... other metadata ...
}; %>

<h1><%= config.title %></h1>
```


### Compilation
File placement in the source directory determines its location in the public directory:

`source/pages/about.ejs` → `public/about/index.html`
`source/pages/index.ejs` → `public/index.html`
`source/pages/projects/my-project.ejs` → `public/projects/my-project/index.html`


## Project Structure and Key Files

- `start.js`: Initiates BrowserSync when `npm start` is run.
- `config.js`: Central configuration for site and server parameters.
- `package.json`: Holds metadata, scripts, dependencies, and Zin's custom CLI command.

### `generator/` - Core Generative Logic

- `browser-sync.js`: Live-reload server.
- `build.js`: Main build process.
- `cli.js`: Command-line interface.
- `collections.js`: Page categorization.
- `fileOps.js`: File operations utilities.
- `renderer.js`: EJS to HTML compilation.
- `styles.js`: SASS to CSS transformation.
- `utils.js`: JSON loading utilities.

## License

Zin operates under the MIT license.
