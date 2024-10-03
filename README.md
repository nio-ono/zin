# Zin

## Introduction

Zin is a static site generator designed around EJS templating, providing a uniform but flexible development environment that supports both rigorous use of templating and fast deployment and experimentation.

### Ethos

- **Minimalism**: Zin maintains a minimum of dependencies and prioritizes rapid development, deployment, and iteration.
- **Uniform Environment**: All content and templates are stored in EJS and the project in general sticks to JS/Node-y ways of doing things, ensuring a uniform development environment that reduces cognitive overhead and maximizes expressiveness.
- **Configurability:** While it provides some starter pages and templates, the structure of your project is up to you via the config file. 
- **Template-Driven Development**: Zin is biased towards storing site content as pure data, emphasizing templates. This structure underscores the DRY (Don't Repeat Yourself) principle and promotes consistent theming.

### Key Functionality

- **Dynamic Templating**: Leverages EJS templates for dynamic content, integrating configurations with templates to produce the final HTML.
- **SASS Compilation**: All `.scss` files in `styles` undergo compilation to `.css` within `public/styles`, with the exception of those prefixed with `_`.
- **Collections**: Organizes pages into collections based on their directory, facilitating content grouping.

## Installation

To install Zin globally, run:

npm install -g zin

## Usage

### Initialize a new project
zin init

### Build the site
zin build

### Start development server
npm start

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
   
3. **Wiping the Public Directory**: On detecting changes, the `public` directory undergoes a clean slate reset. This ensures no residual files from previous compilations linger, making deployments cleaner and reducing the chance of outdated content errors.
   
4. **Instant Updates**: The server watches for changes, and upon detection, immediately undertakes the compilation process.

### Rationale Behind Server Mechanics:

- **Avoiding Complexity**: By resetting the `public` directory and bypassing caching, Zin avoids the intricacies of differential builds. This ensures that developers always work with the most recent content, free from legacy data glitches.
   
- **Speed and Efficiency**: Instant updates and live reloading eliminate the manual refresh chore, accelerating the development process.
   
- **Clean Deployments**: With every change ensuring a fresh `public` directory, deployments remain clutter-free, reducing potential deployment inconsistencies.

### Design Philosophy

Zin emphasizes fluidity, simplicity, and a no-surprises environment. The compiler and server mechanics aim to give developers a streamlined experience, where the focus remains on content and creativity, not troubleshooting or manual interventions. Every design choice, from live reloading to wiping the `public` directory, stems from a commitment to offering an uncomplicated, real-time development experience.

## Configuration

Zin uses a `config.js` file at the root of your project for configuration. Here's an overview of its structure:

### `site`

This section contains metadata related to the overall site.

- **`name`**: The title or name of your project. Typically rendered in the `<title>` tag or the header of a website.
- **`description`**: A brief description or tagline. Often used in meta tags for SEO or as a website's subtitle.

### `server`

This section contains configurations related to the server and directory structures.

- **`port`**: Specifies the port on which the development server will run. By default, it's set to 3000.
- **`paths`**: Defines various paths essential for both source content and compiled output. This makes it easy to change directory names or structures if needed.
  - **`source`**: The primary directory where all your site content, layout templates, styles, and client-side scripts reside.
  - **`public`**: The target directory where your project compiles to. This is essentially what you'd deploy.
  - **`sourcePaths`**: This subsection breaks down the structure within the source directory:
    - **`pages`**: Houses the actual pages of your site, complete with their content.
    - **`templates`**: Contains layout template files that offer structure to the site.
    - **`styles`**: This directory will contain both SCSS and CSS files.
    - **`scripts`**: This is where you'd place all client-side scripts.
    - **`assets`**: A generic container for all other assets like images, fonts, and more.

With `config.js`, Zin provides a centralized space to manage essential configurations, streamlining development and offering flexibility in organizing and accessing project components.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.