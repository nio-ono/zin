# Zin

## Introduction

Zin is a static site generator designed around EJS templating, providing a uniform but flexible development environment that supports both rigorous use of templating and fast deployment and experimentation.

### Ethos

- **Minimalism**: Zin maintains a minimum of dependencies and prioritizes rapid development, deployment, and iteration.
- **Uniform Environment**: All content and templates are stored in EJS and the project in general sticks to JS/Node-y ways of doing things, ensuring a uniform development environment that reduces cognitive overhead and maximizes expressiveness.
- **Configurability:** While it provides some starter pages and templates, the structure of your project is up to you via the config file. 
- **Template-Driven Development**: Zin is biased towards storing site content as pure data, emphasizing templates. This structure underscores the DRY (Don't Repeat Yourself) principle and promotes consistent theming.

### Key Functionality

- **Incremental Rendering**: Tracks template includes and SCSS imports so only the pages or entrypoints affected by a change are rebuilt.
- **Dynamic Templating**: Uses EJS for layouts and partials while keeping site configuration in familiar JavaScript modules.
- **Automatic Collections**: Groups pages by directory, exposing the structure to your templates without additional wiring.
- **Content Hashing**: Skips writes and BrowserSync reloads when output hasn’t changed, keeping the dev loop quiet and fast.

## Installation

To install Zin globally, run:

npm install -g zin

## Usage

### Initialize a new project
`zin init`

Flags:
- `--yes` / `-y`: create starter files without prompting
- `--force` / `-f`: overwrite existing `source`, `config.js`, or `globals.js`

### Build the site
`zin build`

### Start development server
`zin serve`

Optional: `zin serve --port 4000`

### Clean the publish directory
`zin clean`

## Compiler Mechanics

Zin's compiler is crafted to take the rich content and configurations from the `source` directory and mold it into a deploy-ready structure within the `public` directory.

#### Compilation Flow:

1. **Read**: The compiler begins by reading the `source` directory.
   
2. **Transform**: EJS pages and templates merge, styles (SCSS) transpile to CSS, and collections form based on directory groupings.
   
3. **Output**: The result is organized and output to the `public` directory.

Here's a brief transformation representation:

Before:
source/
|-- pages/
|   |-- about.ejs
|   |-- index.ejs
|-- styles/
|   |-- main.scss

After:
public/
|-- about/
|   |-- index.html
|-- index.html
|-- styles/
|   |-- main.css

## The Development Server
   
Zin's server is more than just a static file server; it's a dynamic development companion:
   
1. **Live Reloading**: Changes in the `source` directory trigger the server to recompile the affected parts and refresh your browser, ensuring you always view the latest version.
   
2. **No Caching**: To guarantee that developers see real-time modifications, the Zin server avoids caching. Every request fetches fresh content.
   
3. **Incremental rebuilds**: Only the pages, styles, or assets touched by a change are recompiled. Dependency graphs track template includes and SCSS imports.

4. **Intelligent Debounce & Concurrency**: File events are batched and builds are limited to a configurable level of parallelism so large change sets do not overwhelm the process.

### Rationale Behind Server Mechanics:

- **Avoiding Surprises**: Incremental rebuilds are the default, but `zin clean` is available when you need a fresh publish directory.
   
- **Speed and Efficiency**: Instant updates and live reloading eliminate the manual refresh chore, accelerating the development process.
   
- **Clean Deployments**: With every change ensuring a fresh `public` directory, deployments remain clutter-free, reducing potential deployment inconsistencies.

### Design Philosophy

Zin emphasizes fluidity, simplicity, and a no-surprises environment. The compiler and server mechanics aim to give developers a streamlined experience, where the focus remains on content and creativity, not troubleshooting or manual interventions. Every design choice, from live reloading to wiping the `public` directory, stems from a commitment to offering an uncomplicated, real-time development experience.

## Configuration

Zin stores configurations in two files: `config.js`, for server configuration, and `globals.js`, for metadata like the site title and description.

### `config`

Zin's server configuration is managed through a `config.js` file located at the project root.

- **`port`**: Port used when running `zin serve`.
- **`directories`**: Controls the layout of your workspace.
  - **`source`**: Root for pages, templates, assets, and styles.
  - **`public`**: Publish directory (served in dev and suitable for deployment).
  - **`pages`**: Optional subdirectory inside `source` scoped to page content.
- **`allowConfigJSON`**: When true, page templates may include an `@config … @config` block containing JSON (with comments) instead of a JavaScript `const config` declaration.
- **`concurrency`** *(optional)*: Limits the number of concurrent tasks.
  - **`render`**: Page renders processed in parallel (default `8`).
  - **`styles`**: SCSS entrypoints compiled in parallel (default `8`).

### `globals`

`globals.js` exports the metadata you want available in templates. Export plain values or helper functions and access them directly in your pages and layouts.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
