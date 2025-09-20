// Emergency Production Fix for Node Relations Issue
// This script creates patches for controllers to handle the schema mismatch

const fs = require('fs');
const path = require('path');

const controllers = [
    'src/controllers/floorController.ts',
    'src/controllers/parkingLotController.ts',
    'src/controllers/parkingSlotController.ts'
];

function createBackup(filePath) {
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ Backup created: ${backupPath}`);
    }
}

function patchController(filePath) {
    console.log(`🔧 Patching ${filePath}...`);

    let content = fs.readFileSync(filePath, 'utf8');

    // Remove node relations temporarily to prevent database errors
    const patches = [
        // Remove 'parkingSlots.node' from relations arrays
        {
            find: /relations:\s*\[[^\]]*'parkingSlots\.node'[^\]]*\]/g,
            replace: (match) => {
                return match.replace(/, 'parkingSlots\.node'/g, '').replace(/'parkingSlots\.node',?\s*/g, '');
            }
        },
        // Remove 'floors.parkingSlots.node' from relations arrays
        {
            find: /relations:\s*\[[^\]]*'floors\.parkingSlots\.node'[^\]]*\]/g,
            replace: (match) => {
                return match.replace(/, 'floors\.parkingSlots\.node'/g, '').replace(/'floors\.parkingSlots\.node',?\s*/g, '');
            }
        },
        // Remove standalone 'node' from relations (but keep other node relations like 'node.something')
        {
            find: /relations:\s*\[[^\]]*'node'[^\]]*\]/g,
            replace: (match) => {
                // Only remove standalone 'node', not 'node.something'
                return match.replace(/, 'node'(?![.])/g, '').replace(/'node'(?![.]),?\s*/g, '');
            }
        }
    ];

    let patched = false;
    patches.forEach(patch => {
        const originalContent = content;
        content = content.replace(patch.find, patch.replace);
        if (content !== originalContent) {
            patched = true;
        }
    });

    if (patched) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Patched ${filePath}`);
    } else {
        console.log(`ℹ️  No changes needed for ${filePath}`);
    }
}

function restoreBackups() {
    console.log('\n🔄 To restore original files later, run:');
    controllers.forEach(controller => {
        const backupPath = controller + '.backup';
        if (fs.existsSync(backupPath)) {
            console.log(`   cp ${backupPath} ${controller}`);
        }
    });
}

console.log('🚨 Emergency Production Fix - Removing Node Relations');
console.log('This temporarily removes node relations from controllers to prevent 500 errors\n');

controllers.forEach(controller => {
    if (fs.existsSync(controller)) {
        createBackup(controller);
        patchController(controller);
    } else {
        console.log(`⚠️  File not found: ${controller}`);
    }
});

console.log('\n✅ Emergency fix applied!');
console.log('\n📋 Next steps:');
console.log('1. Build and deploy this patched version: npm run build');
console.log('2. Test the APIs - they should work but without node information');
console.log('3. Run the proper migration when possible: npm run migration:run');
console.log('4. Restore full functionality by reverting patches and redeploying');

restoreBackups();