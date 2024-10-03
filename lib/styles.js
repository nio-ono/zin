const fs = require('fs-extra');
const path = require('path');
const sass = require('sass');
const { getFilesInDir } = require('./fileOps');

function compileSASSToCSS(paths) {
    getFilesInDir(paths.styles).forEach(filePath => {
        const ext = path.extname(filePath);
        const fileName = path.basename(filePath);

        if (ext === '.scss' && !fileName.startsWith('_')) {
            // Compile SCSS to CSS
            try {
                const cssOutput = sass.renderSync({ file: filePath });
                const outputPath = path.join(paths.public, 'styles', fileName.replace('.scss', '.css'));
                fs.writeFileSync(outputPath, cssOutput.css);
            } catch (error) {
                console.error(`Failed to compile SASS for ${filePath}.`, error);
            }
        } else if (ext === '.css') {
            // Copy CSS files directly
            try {
                const outputPath = path.join(paths.public, 'styles', fileName);
                fs.copySync(filePath, outputPath);
            } catch (error) {
                console.error(`Failed to copy CSS file ${filePath}.`, error);
            }
        }
    });
}

module.exports = { compileSASSToCSS };
