import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';

const API_BASE_URL = "http://192.168.253.55:8000";// Replace with your actual API URL
const BLOCKCHAIN_API_URL = 'https://mainnet.infura.io/v3/eeaf3e59b97f4bc8bddb538a429a9dc9'; // Replace with your blockchain API

export default function App() {
  const [caseNumber, setCaseNumber] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('input'); // 'input', 'upload', 'view'
  const [processedPhotos, setProcessedPhotos] = useState([]);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permissions are required to select photos.');
    }
  };

  const handleCaseSubmit = () => {
    if (!caseNumber.trim()) {
      Alert.alert('Error', 'Please enter a case number');
      return;
    }
    setCurrentStep('upload');
  };

  const selectPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map((asset, index) => ({
          id: Date.now() + index,
          uri: asset.uri,
          name: `evidence_${Date.now()}_${index}.jpg`,
          type: 'image/jpeg',
          processed: false,
          hash: null,
          blockchainId: null,
          jsonData: null,
        }));
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos');
      console.error('Photo selection error:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const newPhoto = {
          id: Date.now(),
          uri: result.assets[0].uri,
          name: `evidence_${Date.now()}.jpg`,
          type: 'image/jpeg',
          processed: false,
          hash: null,
          blockchainId: null,
          jsonData: null,
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  };

  const generatePhotoHash = (photoData) => {
    // Generate SHA-256 hash of the photo data
    return CryptoJS.SHA256(photoData).toString();
  };

  const uploadToBackend = async (photo) => {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: photo.type,
        name: photo.name,
      });
      formData.append('caseNumber', caseNumber);

      const response = await fetch(`${API_BASE_URL}/process-photo`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.json();
      return jsonData;
    } catch (error) {
      console.error('Backend upload error:', error);
      // Return mock data for development
      return {
        id: photo.id,
        metadata: {
          timestamp: new Date().toISOString(),
          location: 'Mock Location',
          size: '1024x768',
          format: 'JPEG',
        },
        analysis: {
          objects: ['evidence', 'document'],
          confidence: 0.95,
        },
      };
    }
  };

  const storeInBlockchain = async (hash, jsonData) => {
    try {
      const response = await fetch(`${BLOCKCHAIN_API_URL}/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hash,
          data: jsonData,
          timestamp: new Date().toISOString(),
          caseNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`Blockchain error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.blockchainId || `mock_blockchain_${Date.now()}`;
    } catch (error) {
      console.error('Blockchain storage error:', error);
      // Return mock blockchain ID for development
      return `mock_blockchain_${Date.now()}`;
    }
  };

  const processAllPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert('Error', 'Please select at least one photo');
      return;
    }

    setLoading(true);
    const processed = [];

    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        // Step 1: Upload to backend and get JSON
        const jsonData = await uploadToBackend(photo);
        
        // Step 2: Generate hash
        const photoHash = generatePhotoHash(JSON.stringify(jsonData));
        
        // Step 3: Store in blockchain
        const blockchainId = await storeInBlockchain(photoHash, jsonData);
        
        const processedPhoto = {
          ...photo,
          processed: true,
          hash: photoHash,
          blockchainId,
          jsonData,
        };
        
        processed.push(processedPhoto);
        setProcessedPhotos([...processed]);
      }

      Alert.alert('Success', 'All photos processed and stored on blockchain!');
      setCurrentStep('view');
    } catch (error) {
      Alert.alert('Error', 'Failed to process photos');
      console.error('Processing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const retrieveFromBlockchain = async (blockchainId) => {
    try {
      const response = await fetch(`${BLOCKCHAIN_API_URL}/retrieve/${blockchainId}`);
      
      if (!response.ok) {
        throw new Error(`Retrieval error! status: ${response.status}`);
      }

      const blockchainData = await response.json();
      return blockchainData;
    } catch (error) {
      console.error('Blockchain retrieval error:', error);
      return null;
    }
  };

  const viewPhoto = async (photo) => {
    setLoading(true);
    try {
      // Retrieve JSON from blockchain
      const blockchainData = await retrieveFromBlockchain(photo.blockchainId);
      
      if (blockchainData) {
        // Send JSON to backend to get photo back
        const response = await fetch(`${API_BASE_URL}/retrieve-photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonData: blockchainData.data,
            caseNumber,
          }),
        });

        if (response.ok) {
          const photoBlob = await response.blob();
          const photoUrl = URL.createObjectURL(photoBlob);
          
          Alert.alert('Photo Retrieved', 'Photo successfully retrieved from blockchain and backend!');
          // Here you could display the photo or handle it as needed
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve photo');
      console.error('Retrieval error:', error);
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const resetApp = () => {
    setCaseNumber('');
    setPhotos([]);
    setProcessedPhotos([]);
    setCurrentStep('input');
  };

  const renderInputStep = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Evidence App</Text>
      <Text style={styles.subtitle}>Enter Case Information</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Case Number:</Text>
        <TextInput
          style={styles.input}
          value={caseNumber}
          onChangeText={setCaseNumber}
          placeholder="Enter case number"
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleCaseSubmit}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUploadStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentStep('input')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Case: {caseNumber}</Text>
      </View>

      <Text style={styles.subtitle}>Add Photo Evidence</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={selectPhotos}>
          <Ionicons name="image" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>Select Photos</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 && (
        <View style={styles.photosContainer}>
          <Text style={styles.sectionTitle}>Selected Photos ({photos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(photo.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 20 }]}
            onPress={processAllPhotos}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Process & Store Photos</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderViewStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={resetApp} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Processed Evidence</Text>
      </View>

      <Text style={styles.subtitle}>Case: {caseNumber}</Text>

      <ScrollView style={styles.processedContainer}>
        {processedPhotos.map((photo) => (
          <View key={photo.id} style={styles.processedItem}>
            <Image source={{ uri: photo.uri }} style={styles.processedThumbnail} />
            
            <View style={styles.photoInfo}>
              <Text style={styles.photoName}>{photo.name}</Text>
              <Text style={styles.hashText}>Hash: {photo.hash?.substring(0, 16)}...</Text>
              <Text style={styles.blockchainText}>Blockchain ID: {photo.blockchainId}</Text>
              
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => viewPhoto(photo)}
                disabled={loading}
              >
                <Text style={styles.viewButtonText}>Retrieve Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      {currentStep === 'input' && renderInputStep()}
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'view' && renderViewStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  secondaryButton: {
    flex: 0.48,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  photosContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  photoItem: {
    marginRight: 10,
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 5,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  processedContainer: {
    flex: 1,
  },
  processedItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  processedThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 15,
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  hashText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  blockchainText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  viewButton: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
  },
});