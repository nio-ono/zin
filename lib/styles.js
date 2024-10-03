const fs = require('fs');
const path = require('path');
const sass = require('sass');
const { getFilesInDir } = require('./fileOps');

function compileSASSToCSS(paths) {
    getFilesInDir(paths.styles).forEach(filePath => {
        if (path.extname(filePath) === '.scss' && !path.basename(filePath).startsWith('_')) {
            try {
                const cssOutput = sass.renderSync({ file: filePath });
                const outputPath = path.join(paths.public, 'styles', path.basename(filePath, '.scss') + '.css');
                fs.writeFileSync(outputPath, cssOutput.css);
            } catch (error) {
                console.error(`Failed to compile SASS for ${filePath}.`, error);
            }
        }
    });
}

module.exports = { compileSASSToCSS };
