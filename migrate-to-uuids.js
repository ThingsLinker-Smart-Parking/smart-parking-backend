#!/usr/bin/env node

/**
 * Migration script to convert all parseInt() calls in controllers to UUID string handling
 * This script will systematically replace parseInt() calls with UUID validation
 */

const fs = require('fs');
const path = require('path');

// Controllers directory
const controllersDir = path.join(__dirname, 'src/controllers');

// Get all controller files
const controllerFiles = [
    'parkingSlotController.ts',
    'parkingLotController.ts',
    'floorController.ts',
    'nodeController.ts',
    'gatewayController.ts',
    'subscriptionController.ts'
];

function updateControllerFile(filePath) {
    console.log(`Updating ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let isModified = false;

    // Add UUID validation imports if not already present
    if (!content.includes('validateUuidParam')) {
        content = content.replace(
            /import { ([^}]+) } from ['"]\.\.\/utils\/validation['"]/,
            `import { $1, validateUuidParam } from '../utils/validation'`
        );
        
        // If no validation import exists, add it
        if (!content.includes("from '../utils/validation'")) {
            const authImportMatch = content.match(/import.*AuthRequest.*from.*auth/);
            if (authImportMatch) {
                content = content.replace(
                    authImportMatch[0],
                    authImportMatch[0] + "\nimport { validateUuidParam } from '../utils/validation';"
                );
            }
        }
        isModified = true;
    }

    // Replace parseInt() calls for ID parameters
    const parseIntPatterns = [
        // Basic ID patterns
        {
            pattern: /parseInt\(([a-zA-Z_][a-zA-Z0-9_]*)\)/g,
            replacement: (match, paramName) => {
                // Only replace common ID parameter names
                if (['id', 'floorId', 'parkingLotId', 'gatewayId', 'nodeId', 'parkingSlotId'].includes(paramName)) {
                    return paramName;
                }
                return match; // Don't replace other parseInt calls
            }
        }
    ];

    // Apply replacements
    parseIntPatterns.forEach(({ pattern, replacement }) => {
        const originalContent = content;
        content = content.replace(pattern, replacement);
        if (content !== originalContent) {
            isModified = true;
        }
    });

    // Add UUID validation for common patterns
    const validationPatterns = [
        // Pattern for function start with ID parameter
        {
            pattern: /(export const \w+ = async \(req: AuthRequest, res: Response\): Promise<Response> => \{[\s]*const \{ (id|floorId|parkingLotId|gatewayId|nodeId|parkingSlotId) \} = req\.params;[\s]*try \{)/g,
            replacement: (match, funcStart, idParam) => {
                return `${funcStart}
        // Validate UUID
        const ${idParam}Validation = validateUuidParam(${idParam}, '${idParam}');
        if (!${idParam}Validation.isValid) {
            return res.status(400).json({
                success: false,
                message: ${idParam}Validation.error
            });
        }
`;
            }
        }
    ];

    validationPatterns.forEach(({ pattern, replacement }) => {
        const originalContent = content;
        content = content.replace(pattern, replacement);
        if (content !== originalContent) {
            isModified = true;
        }
    });

    // Fix specific TypeScript issues
    content = content.replace(/gateway\.parkingLot = null as any;/g, 'gateway.parkingLot = null as any;');
    content = content.replace(/node\.parkingSlot = null as any;/g, 'node.parkingSlot = null as any;');
    
    if (isModified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filePath}`);
    } else {
        console.log(`⏭️  No changes needed for ${filePath}`);
    }
}

function main() {
    console.log('🚀 Starting UUID migration...');
    
    controllerFiles.forEach(fileName => {
        const filePath = path.join(controllersDir, fileName);
        if (fs.existsSync(filePath)) {
            updateControllerFile(filePath);
        } else {
            console.log(`⚠️  File not found: ${filePath}`);
        }
    });
    
    console.log('✨ UUID migration completed!');
    console.log('\nNext steps:');
    console.log('1. Review the changes manually');
    console.log('2. Update test files to use UUIDs');
    console.log('3. Update API documentation');
    console.log('4. Test the system');
}

if (require.main === module) {
    main();
}