#!/bin/bash

echo "🔍 VIATICOS 2025 - SYSTEM VERIFICATION SCRIPT"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

# 1. Check if containers are running
echo -e "\n${YELLOW}1. Checking Docker containers...${NC}"
BACKEND_RUNNING=$(docker ps --filter "name=viaticos_backend" --format "table {{.Names}}" | grep -c viaticos_backend)
FRONTEND_RUNNING=$(docker ps --filter "name=viaticos_frontend" --format "table {{.Names}}" | grep -c viaticos_frontend)
DB_RUNNING=$(docker ps --filter "name=viaticos_db" --format "table {{.Names}}" | grep -c viaticos_db)

print_status $((1-BACKEND_RUNNING)) "Backend container running"
print_status $((1-FRONTEND_RUNNING)) "Frontend container running"
print_status $((1-DB_RUNNING)) "Database container running"

# 2. Check backend health
echo -e "\n${YELLOW}2. Checking backend health...${NC}"
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)
if [ "$BACKEND_HEALTH" = "200" ]; then
    print_status 0 "Backend health endpoint responding"
else
    print_status 1 "Backend health endpoint (got $BACKEND_HEALTH)"
fi

# 3. Check frontend accessibility
echo -e "\n${YELLOW}3. Checking frontend accessibility...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_status 0 "Frontend accessible"
else
    print_status 1 "Frontend accessibility (got $FRONTEND_STATUS)"
fi

# 4. Check for TypeScript compilation errors
echo -e "\n${YELLOW}4. Checking for TypeScript compilation errors...${NC}"
FRONTEND_LOGS=$(docker logs viaticos_frontend --tail 20 2>&1)
if echo "$FRONTEND_LOGS" | grep -q "ERROR in"; then
    print_status 1 "TypeScript compilation (errors found)"
    echo -e "${RED}Recent compilation errors:${NC}"
    echo "$FRONTEND_LOGS" | grep -A 3 "ERROR in" | head -10
else
    print_status 0 "TypeScript compilation"
fi

# 5. Test key API endpoints
echo -e "\n${YELLOW}5. Testing key API endpoints...${NC}"

# Get auth token
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email": "test@test.com", "password": "admin123"}' http://localhost:8000/api/auth/login | jq -r '.access_token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    print_status 0 "Authentication endpoint"
    
    # Test taxes API
    TAXES_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/taxes/ | jq '.taxes | length' 2>/dev/null)
    if [ "$TAXES_COUNT" -gt 0 ] 2>/dev/null; then
        print_status 0 "Taxes API ($TAXES_COUNT taxes loaded)"
    else
        print_status 1 "Taxes API"
    fi
    
    # Test suppliers API with tax_name
    SUPPLIER_TAX_NAME=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/suppliers/ | jq -r '.suppliers[0].tax_name' 2>/dev/null)
    if [ "$SUPPLIER_TAX_NAME" != "null" ] && [ -n "$SUPPLIER_TAX_NAME" ]; then
        print_status 0 "Suppliers API with tax_name field"
    else
        print_status 1 "Suppliers API with tax_name field"
    fi
else
    print_status 1 "Authentication endpoint"
    print_status 1 "Taxes API (auth failed)"
    print_status 1 "Suppliers API (auth failed)"
fi

# 6. Check database connectivity
echo -e "\n${YELLOW}6. Checking database connectivity...${NC}"
DB_CHECK=$(docker exec viaticos_db psql -U postgres -d viaticos -c "SELECT 1;" 2>/dev/null | grep -c "1 row")
print_status $((1-DB_CHECK)) "Database connectivity"

# 7. Verify key database tables exist
echo -e "\n${YELLOW}7. Verifying database schema...${NC}"
TAXES_TABLE=$(docker exec viaticos_db psql -U postgres -d viaticos -c "\dt taxes" 2>/dev/null | grep -c "taxes")
SUPPLIERS_TAX_FIELD=$(docker exec viaticos_db psql -U postgres -d viaticos -c "\d factura_suppliers" 2>/dev/null | grep -c "tax_name")
EXPENSES_NO_COMMENTS=$(docker exec viaticos_db psql -U postgres -d viaticos -c "\d expenses" 2>/dev/null | grep -c "comments")

print_status $((1-TAXES_TABLE)) "Taxes table exists"
if [ "$SUPPLIERS_TAX_FIELD" -gt 0 ]; then
    print_status 0 "Suppliers tax_name field exists"
else
    print_status 1 "Suppliers tax_name field exists"
fi
print_status $EXPENSES_NO_COMMENTS "Comments field removed from expenses"

# Final summary
echo -e "\n${YELLOW}=============================================="
echo "VERIFICATION SUMMARY"
echo "=============================================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! System is fully operational.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  $ERRORS ISSUES FOUND! System needs attention.${NC}"
    exit 1
fi
