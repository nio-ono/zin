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



## Usage and Installation

Using Zin revolves around understanding its compiler, server mechanics, and the intricacies that ensure smooth website development.

### Setting up Zin

- **Initialization:** `zin init` sets up a starter structure.
- **Development Mode:** `npm start` launches BrowserSync, monitoring the source directory. On changes:
  - Site rebuilds using `buildSite` in `build.js`.
  - BrowserSync refreshes the view.
- **Building:** `npm run build` creates static assets.

1. Clone the Zin repository:
```
git clone https://github.com/nio-ono/zin/ your_project_name
```

2. Navigate to the project directory:
```
cd your_project_name
```

3. Install dependencies:
```
npm install
```


4. Start the Zin development server:
```
npm start
```


### Compiler Mechanics

Zin's compiler is crafted to take the rich content and configurations from the `source` directory and mold it into a deploy-ready structure within the `public` directory.

#### Compilation Flow:

1. **Read**: The compiler begins by reading the `source` directory.
   
2. **Transform**: EJS pages and templates merge, styles (SCSS) transpile to CSS, and collections form based on directory groupings.
   
3. **Output**: The result is organized and output to the `public` directory.

Here's a brief transformation representation:

Before:
```
source/
|-- pages/
|-- about.ejs
|-- index.ejs
|-- styles/
|-- main.scss
```

After:
```
public/
|-- about/
|-- index.html
|-- index.html
|-- styles/
|-- main.css
```


Pages in `source` transform into structured directories in `public` for clean URLs, with the exception of the root `index` page.

### The Development Server

Zin's server is more than just a static file server; it's a dynamic development companion:

1. **Live Reloading**: Changes in the `source` directory trigger the server to recompile the affected parts and refresh your browser, ensuring you always view the latest version.
   
2. **No Caching**: To guarantee that developers see real-time modifications, the Zin server avoids caching. Every request fetches fresh content.
   
3. **Wiping the Public Directory**: On detecting changes, the `public` directory undergoes a clean slate reset. This ensures no residual files from previous compilations linger, making deployments cleaner and reducing the chance of outdated content errors.
   
4. **Instant Updates**: The server watches for changes, and upon detection, immediately undertakes the compilation process.

#### Rationale Behind Server Mechanics:

- **Avoiding Complexity**: By resetting the `public` directory and bypassing caching, Zin avoids the intricacies of differential builds. This ensures that developers always work with the most recent content, free from legacy data glitches.
   
- **Speed and Efficiency**: Instant updates and live reloading eliminate the manual refresh chore, accelerating the development process.
   
- **Clean Deployments**: With every change ensuring a fresh `public` directory, deployments remain clutter-free, reducing potential deployment inconsistencies.

### Design Philosophy

Zin emphasizes fluidity, simplicity, and a no-surprises environment. The compiler and server mechanics aim to give developers a streamlined experience, where the focus remains on content and creativity, not troubleshooting or manual interventions. Every design choice, from live reloading to wiping the `public` directory, stems from a commitment to offering an uncomplicated, real-time development experience.


## `config.js`

`config.js` is at the heart of your Zin project, housing configuration settings and parameters for the system to function seamlessly. Let's delve into each of its components and their significance.

### `site`

This section contains metadata related to the overall site.

- **`name`**: The title or name of your project. Typically rendered in the `<title>` tag or the header of a website.
```
name: "Untitled Zin Project",
```
- **`description`**: A brief description or tagline. Often used in meta tags for SEO or as a website's subtitle.
```
description: "In the quiet of dawn, the world holds its breath, awaiting a new beginning.",
```

### `server`
This section contains configurations related to the server and directory structures.

- **`port`**: Specifies the port on which the development server will run. By default, it's set to 3000`.
```
port: 3000,
```
- **`paths`**: Defines various paths essential for both source content and compiled output. This makes it easy to change directory names or structures if needed.
- - **`source`:** The primary directory where all your site content, layout templates, styles, and client-side scripts reside.
```
source: "./source/",
```

- - **`public`**: The target directory where your project compiles to. This is essentially what you'd deploy.
```
public: "./public/",
```

- - **`sourcePaths`**: This subsection breaks down specific paths within the main `source` directory.
- - - **`pages`**: Houses the actual pages of your site, complete with their content.
```
pages: "pages/",
```

- - - **`templates`**: Contains layout template files that offer structure to the site. They often wrap around content from the pages directory.
- - - **`styles`**: This directory will contain both SCSS and CSS files. They define the look and feel of your site.
- - - **`scripts`**: This is where you'd place all client-side scripts, enhancing your site's functionality.
- - - **`assets`**: A generic container for all other assets like images, fonts, and more.

With `config.js`, Zin provides a centralized space to manage essential configurations, streamlining development and offering flexibility in organizing and accessing project components.


## `/source`: Pages, Templates, and Styles

Zin projects primarily revolve around the `source` directory, where you'll find the heart of your site's content and logic. This directory undergoes a compilation process to create a deploy-ready site within the `public` directory. The structure is flexible and can be adjusted via `config.js`.

### Overview
- **Pages:** Objects consisting of config (metadata) and content (HTML + EJS). Pages are the primary content holders and can leverage templates for a consistent design.
- **Templates:** EJS files that determine the overall layout and presentation of your pages. They interact dynamically with page data.
- **Styles:** SCSS files that determine the appearance of your site. Compiled to CSS in the public/styles directory.
- **Scripts (To be implemented):** Potentially for JS scripts enhancing interactivity and functionality.
- **Assets (To be implemented):** A place for images, fonts, and other static assets.

### Pages
In Zin, pages serve as the cornerstone of your site's content. Every page comprises two critical components: Config (metadata) and Content (HTML + EJS).

#### Philosophy

Zin's approach is template-driven. Store metadata and configuration in the config, leveraging templates for presentation. The beauty lies in the fluidity; the page's HTML can access this data for a unique blend of consistency and customization, leading to intricate content structures.

#### Config

Every page begins with a config object for metadata and settings:

```
<% const config = {
  title: 'Page Title',
  template: 'default',
  customData: 'Custom data for the page',
}; %>
```

#### Content
The rest of the page houses content - a mix of HTML and EJS:

```
<% const config = {
  title: 'About Us',
  template: 'default',
}; %>

<h2>Welcome to Our Website</h2>
<p>We are a leading innovator in tech.</p>
<h1><%= config.title %></h1>
<p>Learn more about <%= config.title.toLowerCase() %>.</p>
```

#### Collections

When pages are grouped in subdirectories, they're treated as collections. This categorization facilitates organized theming and referencing.

Example:
```
source/
|-- pages/
    |-- articles/
        |-- my-first-article.ejs
        |-- another-article.ejs
```

Collections, like `articles`, can be looped over in templates, offering dynamic content presentation based on groupings.

### Templates
Templates in Zin are the blueprints for your site's appearance. They determine the overall design and layout, embedding dynamic content using the config data from each page.

A basic template might look like:

```
<html>
<head>
    <title><%= config.title %></title>
</head>
<body>
    <header>Welcome to My Site</header>
    <main>
        <h1><%= config.title %></h1>
        <ul>
            <% articles.forEach(article => { %>
                <li><%= article.title %></li>
            <% }); %>
        </ul>
        <%- content %>
    </main>
    <footer>Footer content here.</footer>
</body>
</html>
```

Note that `<%- content %>` is where the main content of your page will be injected, and we loop through the `articles` collection as an example of how collections can be utilized.

### Styles
Zin uses SCSS for styling, offering all the power of nested rules, variables, mixins, and more. This is a standard SCSS implementation, so refer to SCSS documentation for in-depth details.

Only files not prefixed with `_` get compiled. `_` prefixed files act as partials or modules, meant to be imported into other SCSS files.

For example:
```
source/
|-- styles/
    |-- main.scss
    |-- _variables.scss
```

`main.scss`:
```
@import 'variables';
body {
    background-color: $bgColor;
}
```

### Compilation
The `source` directory gets transformed into the `public` directory during the build process. Here's a representation of the transformation:

Before:
```
source/
|-- pages/
    |-- about.ejs
    |-- index.ejs
|-- styles/
    |-- main.scss
```

After:
```
public/
|-- about/
    |-- index.html
|-- index.html
|-- styles/
    |-- main.css
```

Note the transformation of EJS pages into structured directories for clean URLs. The `index` page remains at the root. This structure is customizable via `config.js`.



## `/generator`: Mechanics & Operations

Zin's generator encapsulates the core logic that powers the framework. It manages tasks from watching for file changes, rendering content, to compiling SASS. Here's a deep dive:

### `browser-sync.js`
This script integrates BrowserSync, a powerful tool that saves developers time by automating the browser reload process upon file changes:

- Launches a development server.
- Watches files in the `source` directory for changes.
- Initiates a reload when changes are detected.

### `build.js`
Orchestrates the primary build process:
- Initiates the process of turning EJS templates and pages into static HTML files.
- Triggers the SASS compilation process.
- Directs the resultant files to the appropriate locations in the `public` directory.

### `cli.js`
Provides the command-line interface for Zin:

- Processes commands like `zin init` to scaffold new projects.
- Potential for future CLI features and project management tools.

### `collections.js`
Handles the logic for organizing pages into collections based on their directory:

- Groups content by directory (e.g., all pages in the `projects` directory are treated as a collection).
- This aids in batch processing or rendering related pages.

fileOps.js
A utility module for file operations:

- Reads files from the `source` directory.
- Writes the processed content to the `public` directory.

### `renderer.js`
Central to Zin's operation, this script manages the conversion of EJS to static HTML:

- Interprets the configuration at the top of EJS files.
- Merges templates and page-specific content based on the provided configuration.
- Outputs the final HTML content.

### `styles.js`
Handles the transformation of SASS files into standard CSS:

- Compiles `.scss` files.
- Outputs `.css` files to the `public/styles` directory.
- Manages the inclusion of partials and modules.

### `utils.js`
General utility functions:

- Predominantly focused on the consistent and error-free loading of JSON data.
- Potentially houses other utility functions as the project evolves.


## License

Zin operates under the MIT license.
