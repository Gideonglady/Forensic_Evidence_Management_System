const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read .gitignore patterns
function readGitignore() {
    try {
        const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
        return gitignoreContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(pattern => {
                // Convert gitignore patterns to regex
                if (pattern.startsWith('/')) {
                    pattern = pattern.substring(1);
                }
                if (pattern.endsWith('/')) {
                    pattern = pattern.substring(0, pattern.length - 1);
                }
                return pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
            });
    } catch (error) {
        console.log('No .gitignore file found');
        return [];
    }
}

// Check if a file should be ignored
function shouldIgnore(filePath, ignorePatterns) {
    const relativePath = path.relative('.', filePath);
    
    for (const pattern of ignorePatterns) {
        const regex = new RegExp(pattern);
        if (regex.test(relativePath) || regex.test(path.basename(relativePath))) {
            return true;
        }
    }
    return false;
}

// Get directory structure
function getStructure(dir = '.', prefix = '', ignorePatterns = [], maxDepth = 3, currentDepth = 0) {
    if (currentDepth > maxDepth) return '';
    
    const items = fs.readdirSync(dir)
        .filter(item => !shouldIgnore(path.join(dir, item), ignorePatterns))
        .sort((a, b) => {
            const aPath = path.join(dir, a);
            const bPath = path.join(dir, b);
            const aIsDir = fs.statSync(aPath).isDirectory();
            const bIsDir = fs.statSync(bPath).isDirectory();
            
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });
    
    let structure = '';
    
    items.forEach((item, index) => {
        const itemPath = path.join(dir, item);
        const isLast = index === items.length - 1;
        const isDirectory = fs.statSync(itemPath).isDirectory();
        
        const connector = isLast ? '└── ' : '├── ';
        const nextPrefix = isLast ? '    ' : '│   ';
        
        structure += `${prefix}${connector}${item}`;
        
        if (isDirectory) {
            structure += '/\n';
            if (currentDepth < maxDepth) {
                structure += getStructure(itemPath, prefix + nextPrefix, ignorePatterns, maxDepth, currentDepth + 1);
            }
        } else {
            structure += '\n';
        }
    });
    
    return structure;
}

// Main function
function main() {
    console.log('📁 Photo Evidence App - Clean Project Structure\n');
    
    const ignorePatterns = readGitignore();
    const structure = getStructure('.', '', ignorePatterns, 4);
    
    console.log(structure);
    
    console.log('\n📊 Project Statistics:');
    console.log('=====================');
    
    // Count files and directories
    let fileCount = 0;
    let dirCount = 0;
    
    function countItems(dir = '.') {
        const items = fs.readdirSync(dir)
            .filter(item => !shouldIgnore(path.join(dir, item), ignorePatterns));
        
        items.forEach(item => {
            const itemPath = path.join(dir, item);
            if (fs.statSync(itemPath).isDirectory()) {
                dirCount++;
                countItems(itemPath);
            } else {
                fileCount++;
            }
        });
    }
    
    countItems();
    console.log(`📁 Directories: ${dirCount}`);
    console.log(`📄 Files: ${fileCount}`);
    console.log(`📦 Total Items: ${fileCount + dirCount}`);
    
    // Show package info
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        console.log(`\n📋 Project: ${packageJson.name || 'photo-evidence-app'}`);
        console.log(`📝 Description: ${packageJson.description || 'No description'}`);
        console.log(`🔧 Version: ${packageJson.version || '1.0.0'}`);
    } catch (error) {
        console.log('\n📋 Project: photo-evidence-app');
    }
}

if (require.main === module) {
    main();
}

module.exports = { getStructure, shouldIgnore, readGitignore }; 