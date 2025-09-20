# 🔍 VERIFICATION QUICK REFERENCE

## 🚨 **MANDATORY BEFORE CLAIMING SUCCESS**

### Step 1: Run Verification Script
```bash
cd /Users/macsaurio/Cursor/viaticos2025
./verify-system.sh
```

**✅ SUCCESS:** Exit code 0 + "🎉 ALL CHECKS PASSED!"  
**❌ FAILURE:** Exit code 1 + specific error details

### Step 2: Manual Testing
- [ ] Login/logout flow
- [ ] Create/edit/delete operations  
- [ ] Form validations
- [ ] Language switching
- [ ] File uploads/downloads

### Step 3: Documentation
- [ ] Update verification status
- [ ] Document any known issues
- [ ] Confirm deployment readiness

---

## ⚡ **QUICK HEALTH CHECK**

```bash
# Backend health
curl -s http://localhost:8000/api/health

# Frontend accessibility  
curl -s http://localhost:3000 | grep -q "Viaticos"

# Check for TypeScript errors
docker logs viaticos_frontend --tail 10 | grep "ERROR"

# Database connectivity
docker exec viaticos_db psql -U postgres -d viaticos -c "SELECT 1;"
```

---

## 🚫 **NEVER SAY WITHOUT VERIFICATION:**
- "The system is fully operational"
- "Everything is working correctly"
- "Ready for production/QA"
- "All features implemented successfully"

---

## ✅ **ONLY SAY AFTER VERIFICATION PASSES:**
- "Verification script confirms system is operational"
- "All automated checks passed - ready for manual testing"
- "System verified and ready for deployment"

---

**📖 Full Guide:** `/docs/VERIFICATION_GUIDE.md`
