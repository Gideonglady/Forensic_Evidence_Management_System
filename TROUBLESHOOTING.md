# Troubleshooting Guide

## Current Issues and Solutions

### 1. ImagePicker Deprecation Warning ⚠️
**Issue**: `[expo-image-picker] MediaTypeOptions have been deprecated`

**Status**: ✅ **Expected Behavior**
- This warning is normal for expo-image-picker v16.1.4
- The app still works correctly despite the warning
- The warning can be safely ignored

**Solution**: No action needed - this is a known deprecation warning that doesn't affect functionality.

### 2. Network Request Failed ❌
**Issue**: `Backend upload error: Network request failed`

**Status**: 🔧 **Being Investigated**
- Backend is running and accessible from computer
- Mobile device may have connectivity issues
- Using mock data as fallback

**Possible Causes**:
1. **Firewall blocking connections**
2. **Mobile device not on same network**
3. **Network configuration issues**
4. **Backend not accessible from mobile device**

**Solutions**:
1. **Check network connectivity**:
   ```bash
   npm run backend:test
   ```

2. **Verify mobile device is on same network** as your computer

3. **Check Windows Firewall**:
   - Allow Python/uvicorn through firewall
   - Or temporarily disable firewall for testing

4. **Use mock data mode** (currently working):
   - App continues to function with mock data
   - Photos are processed locally

### 3. Photo Retrieval Errors ❌
**Issue**: `Cannot create URL for blob` and `__turboModuleProxy is not a function`

**Status**: ✅ **Fixed**
- Removed `URL.createObjectURL()` (not available in React Native)
- Updated photo retrieval to use JSON response
- Fixed blob handling issues

**Solution**: Photo retrieval now works with proper React Native APIs.

### 4. Backend Already Running ⚠️
**Issue**: `only one usage of each socket address is normally permitted`

**Status**: ✅ **Normal Behavior**
- Backend is already running on port 8000
- This is expected and good

**Solution**: No action needed - backend is running correctly.

## Current App Status

### ✅ Working Features:
- Photo capture and selection
- Photo processing (mock data)
- Blockchain storage (mock)
- Photo retrieval (mock)
- Backend status monitoring
- Error handling and fallbacks

### 🔧 Partially Working:
- Backend connectivity from mobile device
- Real photo upload to backend

### ❌ Issues:
- Network connectivity from mobile to backend
- ImagePicker deprecation warning (cosmetic)

## Testing Commands

```bash
# Check backend status
npm run backend:status

# Test backend connectivity
npm run backend:test

# Start the app
npm start

# Check network connectivity
node scripts/test-mobile-connectivity.js
```

## Development Mode

The app is currently running in **development mode** with:
- Mock backend responses when network fails
- Mock blockchain storage
- Comprehensive error logging
- Graceful fallbacks

This ensures the app remains functional even when backend connectivity issues occur.

## Next Steps

1. **Test on physical device** to verify network connectivity
2. **Check firewall settings** if network issues persist
3. **Consider using Expo tunnel** for easier development
4. **Deploy backend to cloud** for production use

## Emergency Fallback

If all else fails, the app will continue to work with mock data, allowing you to:
- Capture and process photos
- Store photo metadata
- Test the UI and user experience
- Develop additional features 