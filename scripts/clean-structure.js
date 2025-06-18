const fs = require('fs');
const path = require('path');

// Directories to ignore
const IGNORE_DIRS = [
    '.git',
    'node_modules',
    '.expo',
    'cache',
    'artifacts',
    'backend/venv',
    'backend/__pycache__',
    'backend/uploads',
    '.vscode'
];

// Files to ignore
const IGNORE_FILES = [
    'package-lock.json',
    '*.log',
    '*.ipynb',
    'contract_info.json'
];

function shouldIgnore(name, isDirectory) {
    if (isDirectory) {
        return IGNORE_DIRS.some(dir => name === dir || name.startsWith('.'));
    }
    return IGNORE_FILES.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(name);
        }
        return name === pattern;
    });
}

function getStructure(dir = '.', prefix = '', maxDepth = 4, currentDepth = 0) {
    if (currentDepth > maxDepth) return '';
    
    try {
        const items = fs.readdirSync(dir)
            .filter(item => !shouldIgnore(item, fs.statSync(path.join(dir, item)).isDirectory()))
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
                    structure += getStructure(itemPath, prefix + nextPrefix, maxDepth, currentDepth + 1);
                }
            } else {
                structure += '\n';
            }
        });
        
        return structure;
    } catch (error) {
        return '';
    }
}

function main() {
    console.log('📁 Photo Evidence App - Clean Project Structure\n');
    
    const structure = getStructure('.', '', 4);
    console.log(structure);
    
    console.log('\n📊 Key Directories:');
    console.log('==================');
    console.log('📱 app/          - Main application code');
    console.log('🔧 backend/      - Python backend services');
    console.log('🎨 assets/       - Images, fonts, and static files');
    console.log('🧩 components/   - Reusable React components');
    console.log('⚙️  constants/    - App constants and configurations');
    console.log('📜 contracts/    - Smart contracts (Solidity)');
    console.log('🔗 hooks/        - Custom React hooks');
    console.log('📝 scripts/      - Utility scripts');
    
    console.log('\n📋 Project Type: React Native + Expo + Python Backend + Blockchain');
    console.log('🔗 Technologies: React Native, Expo, Python, Solidity, Hardhat');
}

if (require.main === module) {
    main();
} 