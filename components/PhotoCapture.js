import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { uploadPhoto } from '../utils/api';

export default function PhotoCapture({ visible, caseNumber, onClose, onPhotoUploaded }) {
  const [loading, setLoading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera and photo library permissions are required.');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      console.log('📸 Taking photo...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Remove cropping
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('📸 Camera result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('✅ Photo captured successfully');
        setCapturedImages(prev => [...prev, result.assets[0]]);
      } else {
        console.log('❌ No photo captured or selection canceled');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      Alert.alert('Error', 'Failed to take photo: ' + error.message);
    }
  };

  const selectFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      console.log('🖼️ Selecting photos from gallery...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Remove cropping
        quality: 0.8,
        allowsMultipleSelection: true, // Enable multiple selection
        selectionLimit: 10, // Allow up to 10 photos at once
      });

      console.log('🖼️ Gallery result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log(`✅ Selected ${result.assets.length} photos`);
        setCapturedImages(prev => [...prev, ...result.assets]);
      } else {
        console.log('❌ No photos selected or selection canceled');
      }
    } catch (error) {
      console.error('❌ Gallery error:', error);
      Alert.alert('Error', 'Failed to select photos: ' + error.message);
    }
  };

  const removeImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateHash = async (uri) => {
    try {
      // For React Native, create a hash from the image URI and metadata
      // This is more reliable than trying to read the actual image data
      const imageData = {
        uri: uri,
        timestamp: Date.now(),
        caseNumber: caseNumber,
        size: 'unknown',
        type: 'image/jpeg'
      };
      
      const dataString = JSON.stringify(imageData);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );
      
      return hash;
    } catch (error) {
      console.error('Error generating hash:', error);
      // Fallback: generate a simple hash from timestamp and case number
      const fallbackData = `${caseNumber}_${Date.now()}`;
      return Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fallbackData
      );
    }
  };

  const uploadToBackend = async () => {
    if (capturedImages.length === 0) return;

    setLoading(true);
    setUploadedCount(0);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < capturedImages.length; i++) {
        const image = capturedImages[i];
        setUploadProgress(`Uploading photo ${i + 1} of ${capturedImages.length}...`);

        try {
          // Generate hash for the photo
          const photoHash = await generateHash(image.uri);
          
          // Upload photo to backend
          const uploadResult = await uploadPhoto(caseNumber, image, photoHash);
          
          if (uploadResult.status === 'success') {
            successCount++;
            console.log(`✅ Photo ${i + 1} uploaded successfully`);
          } else {
            errorCount++;
            console.log(`❌ Photo ${i + 1} upload failed: ${uploadResult.message}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Photo ${i + 1} upload error:`, error);
        }
        
        setUploadedCount(i + 1);
      }

      // Show final results
      const message = `Upload completed!\n\n✅ Successfully uploaded: ${successCount}\n❌ Failed: ${errorCount}`;
      
      if (successCount > 0) {
        Alert.alert('Upload Complete', message, [{ 
          text: 'OK', 
          onPress: () => {
            setCapturedImages([]);
            setUploadProgress('');
            setUploadedCount(0);
            onPhotoUploaded && onPhotoUploaded({ successCount, errorCount });
            onClose();
          }
        }]);
      } else {
        Alert.alert('Upload Failed', 'All photos failed to upload. Please try again.', [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photos');
    } finally {
      setLoading(false);
      setUploadProgress('');
      setUploadedCount(0);
    }
  };

  const handleClose = () => {
    if (loading) {
      Alert.alert('Upload in Progress', 'Please wait for the upload to complete.');
      return;
    }
    setCapturedImages([]);
    setUploadProgress('');
    setUploadedCount(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: 350, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A' }}>Capture Evidence</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {capturedImages.length === 0 ? (
            <View>
              <Text style={{ fontSize: 16, color: '#666', marginBottom: 24, textAlign: 'center' }}>
                Take photos or select from gallery for case #{caseNumber}
              </Text>
              
              <TouchableOpacity 
                onPress={takePhoto}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#007AFF', 
                  padding: 16, 
                  borderRadius: 12, 
                  marginBottom: 12 
                }}
              >
                <Ionicons name="camera" size={24} color="#FFF" style={{ marginRight: 12 }} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={selectFromGallery}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#4CAF50', 
                  padding: 16, 
                  borderRadius: 12 
                }}
              >
                <Ionicons name="images" size={24} color="#FFF" style={{ marginRight: 12 }} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Select Multiple Photos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#666', marginBottom: 16, textAlign: 'center' }}>
                Selected Photos ({capturedImages.length})
              </Text>
              
              <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                {capturedImages.map((image, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#F8F8F8', borderRadius: 8, padding: 8 }}>
                    <Image 
                      source={{ uri: image.uri }} 
                      style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600' }}>Photo {index + 1}</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>{image.fileSize ? `${Math.round(image.fileSize / 1024)}KB` : 'Unknown size'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeImage(index)} disabled={loading}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {loading && (
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={{ color: '#666', marginTop: 8 }}>{uploadProgress}</Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>{uploadedCount} of {capturedImages.length} uploaded</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity 
                  onPress={() => setCapturedImages([])}
                  disabled={loading}
                  style={{ 
                    flex: 1, 
                    backgroundColor: '#FF3B30', 
                    padding: 12, 
                    borderRadius: 8, 
                    marginRight: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Clear All</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={uploadToBackend}
                  disabled={loading}
                  style={{ 
                    flex: 1, 
                    backgroundColor: '#007AFF', 
                    padding: 12, 
                    borderRadius: 8, 
                    marginLeft: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>
                    {loading ? 'Uploading...' : `Upload ${capturedImages.length} Photos`}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={selectFromGallery}
                disabled={loading}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#4CAF50', 
                  padding: 12, 
                  borderRadius: 8, 
                  marginTop: 12,
                  justifyContent: 'center'
                }}
              >
                <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Add More Photos</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
} 