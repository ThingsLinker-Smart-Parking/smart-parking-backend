#!/bin/bash

# Quick script to fix remaining parseInt issues and add UUID validation

echo "🚀 Applying remaining UUID fixes..."

# Fix floorController remaining functions
sed -i '' '
/export const createFloor = async/,/try {/ {
    /try {/ a\
        // Validate UUID\
        const parkingLotIdValidation = validateUuidParam(parkingLotId, '\''parkingLotId'\'');\
        if (!parkingLotIdValidation.isValid) {\
            return res.status(400).json({\
                success: false,\
                message: parkingLotIdValidation.error\
            });\
        }\

}
' src/controllers/floorController.ts

sed -i '' '
/export const updateFloor = async/,/try {/ {
    /try {/ a\
        // Validate UUID\
        const idValidation = validateUuidParam(id, '\''id'\'');\
        if (!idValidation.isValid) {\
            return res.status(400).json({\
                success: false,\
                message: idValidation.error\
            });\
        }\

}
' src/controllers/floorController.ts

sed -i '' '
/export const deleteFloor = async/,/try {/ {
    /try {/ a\
        // Validate UUID\
        const idValidation = validateUuidParam(id, '\''id'\'');\
        if (!idValidation.isValid) {\
            return res.status(400).json({\
                success: false,\
                message: idValidation.error\
            });\
        }\

}
' src/controllers/floorController.ts

sed -i '' '
/export const getFloorStatistics = async/,/try {/ {
    /try {/ a\
        // Validate UUID\
        const idValidation = validateUuidParam(id, '\''id'\'');\
        if (!idValidation.isValid) {\
            return res.status(400).json({\
                success: false,\
                message: idValidation.error\
            });\
        }\

}
' src/controllers/floorController.ts

echo "✅ Floor controller updated"

# Fix nodeController - add import first
sed -i '' 's/import { validateRequired }/import { validateRequired, validateUuidParam }/' src/controllers/nodeController.ts

# Replace parseInt calls in nodeController for IDs only (not numeric values)
sed -i '' 's/id: parseInt(\([^)]*\))/id: \1/g' src/controllers/nodeController.ts
sed -i '' 's/gatewayId: parseInt(\([^)]*\))/gatewayId: \1/g' src/controllers/nodeController.ts
sed -i '' 's/parkingSlotId: parseInt(\([^)]*\))/parkingSlotId: \1/g' src/controllers/nodeController.ts

echo "✅ Node controller updated"

# Fix gatewayController - add import first  
sed -i '' 's/import { validateRequired }/import { validateRequired, validateUuidParam }/' src/controllers/gatewayController.ts

# Replace parseInt calls in gatewayController for IDs only
sed -i '' 's/parseInt(\(id\))/\1/g' src/controllers/gatewayController.ts
sed -i '' 's/parseInt(\(gatewayId\))/\1/g' src/controllers/gatewayController.ts
sed -i '' 's/parseInt(\(parkingLotId\))/\1/g' src/controllers/gatewayController.ts

echo "✅ Gateway controller updated"

# Fix subscriptionController - this is more complex, so let's just handle the basic IDs
sed -i '' 's/id: parseInt(id)/id: id/g' src/controllers/subscriptionController.ts
sed -i '' 's/planId: parseInt(planId)/planId: planId/g' src/controllers/subscriptionController.ts

echo "✅ Subscription controller updated"

echo "🎉 UUID migration fixes applied!"
echo ""
echo "⚠️  Manual review needed for:"
echo "1. Validation functions in nodeController.ts"
echo "2. Validation functions in gatewayController.ts"  
echo "3. Numeric parameter parsing (keep parseInt for non-ID fields)"
echo "4. Complex logic in subscriptionController.ts"