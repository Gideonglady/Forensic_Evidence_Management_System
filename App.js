import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { CONFIG, checkBackendHealth } from './constants/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function App() {
  const [currentPage, setCurrentPage] = useState('cases'); // 'cases', 'newCase', 'caseDetails', 'upload'
  const [cases, setCases] = useState([]);
  const [currentCase, setCurrentCase] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processedPhotos, setProcessedPhotos] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const [blockchainProof, setBlockchainProof] = useState(null);
  const [showBlockchainProof, setShowBlockchainProof] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    requestPermissions();
    checkBackendConnection();
  }, []);

  const animateModal = (show) => {
    if (show) {
      setShowPhotoModal(true);
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowPhotoModal(false);
        setSelectedPhoto(null);
      });
    }
  };

  const checkBackendConnection = async () => {
    try {
      const isHealthy = await checkBackendHealth();
      setBackendStatus(isHealthy ? 'connected' : 'disconnected');
      
      if (!isHealthy) {
        console.warn('Backend is not accessible, using mock data');
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendStatus('disconnected');
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permissions are required to select photos.');
    }
  };

  const handleCaseSubmit = () => {
    if (!newCaseNumber.trim()) {
      Alert.alert('Error', 'Please enter a case number');
      return;
    }
    setCurrentPage('upload');
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
      formData.append('caseNumber', newCaseNumber);

      console.log('Uploading to backend:', `${CONFIG.API_BASE_URL}/process-photo`);
      console.log('Photo data:', { uri: photo.uri, type: photo.type, name: photo.name });
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/process-photo`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const jsonData = await response.json();
      console.log('Backend response:', jsonData);
      return jsonData;
    } catch (error) {
      console.error('Backend upload error details:', {
        message: error.message,
        stack: error.stack,
        url: `${CONFIG.API_BASE_URL}/process-photo`,
        errorType: error.name
      });
      
      // Check if it's a network error
      if (error.message.includes('Network request failed') || error.name === 'AbortError') {
        console.log('Network error detected, using mock data');
      }
      
      // Return mock data for development when backend is not available
      console.log('Using mock data for development');
      return {
        id: photo.id,
        metadata: {
          timestamp: new Date().toISOString(),
          location: 'Mock Location',
          size: '1024x768',
          format: 'JPEG',
          filename: photo.name,
          caseNumber: newCaseNumber,
        },
        analysis: {
          objects: ['evidence', 'document'],
          confidence: 0.95,
          processing_status: 'completed',
        },
      };
    }
  };

  const storeInBlockchain = async (hash, jsonData) => {
    try {
      console.log('Storing in blockchain:', hash);
      
      // Show blockchain proof modal
      setBlockchainProof({
        status: 'processing',
        message: 'Storing evidence hash on blockchain...',
        hash: hash,
        caseNumber: newCaseNumber,
        timestamp: new Date().toISOString()
      });
      setShowBlockchainProof(true);
      setUploadProgress(10);
      
      if (CONFIG.USE_MOCK_BLOCKCHAIN) {
        // Mock blockchain storage for development
        const mockBlockchainId = `blockchain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Simulate blockchain storage steps
        setUploadProgress(30);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setBlockchainProof(prev => ({
          ...prev,
          status: 'mining',
          message: 'Transaction being mined...',
          progress: 50
        }));
        setUploadProgress(50);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setBlockchainProof(prev => ({
          ...prev,
          status: 'confirmed',
          message: 'Transaction confirmed on blockchain!',
          transactionHash: mockBlockchainId,
          blockNumber: Math.floor(Math.random() * 1000) + 1,
          gasUsed: '50000',
          progress: 100
        }));
        setUploadProgress(100);
        
        console.log('Mock blockchain storage successful:', mockBlockchainId);
        return mockBlockchainId;
      }
      
      // Real blockchain storage
      setBlockchainProof(prev => ({
        ...prev,
        status: 'sending',
        message: 'Sending transaction to blockchain...',
        progress: 20
      }));
      setUploadProgress(20);
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/store-evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseNumber: newCaseNumber,
          hash: hash,
          metadata: jsonData
        }),
      });

      setUploadProgress(60);

      if (!response.ok) {
        throw new Error(`Blockchain storage failed: ${response.status}`);
      }

      const result = await response.json();
      
      setBlockchainProof(prev => ({
        ...prev,
        status: 'confirmed',
        message: 'Transaction confirmed on blockchain!',
        transactionHash: result.transaction_hash,
        blockNumber: result.block_number,
        gasUsed: result.gas_used || '50000',
        progress: 100
      }));
      setUploadProgress(100);
      
      console.log('Blockchain storage successful:', result);
      return result.transaction_hash;
    } catch (error) {
      console.error('Blockchain storage error:', error);
      
      setBlockchainProof(prev => ({
        ...prev,
        status: 'error',
        message: 'Blockchain storage failed. Using fallback.',
        error: error.message,
        progress: 0
      }));
      
      if (CONFIG.USE_MOCK_BLOCKCHAIN) {
        return `mock_blockchain_${Date.now()}`;
      }
      throw error;
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
        
        // Update progress for current photo
        setBlockchainProof(prev => prev ? {
          ...prev,
          message: `Processing photo ${i + 1} of ${photos.length}...`,
          currentPhoto: i + 1,
          totalPhotos: photos.length
        } : null);
        
        // Step 1: Upload to backend and get JSON
        const jsonData = await uploadToBackend(photo);
        
        // Step 2: Generate hash
        const photoHash = generatePhotoHash(JSON.stringify(jsonData));
        
        // Step 3: Store in blockchain with proof
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

      // Create or update case data
      const caseData = {
        id: Date.now().toString(),
        caseNumber: newCaseNumber,
        title: `Case #${newCaseNumber}`,
        description: `Evidence case containing ${processed.length} photos`,
        createdAt: new Date().toISOString(),
        photoCount: processed.length,
        processedCount: processed.length,
        thumbnails: processed.map(photo => photo.uri),
        photos: processed,
        lastUpdated: new Date().toISOString(),
      };

      // Add to cases list
      setCases(prevCases => {
        const existingCaseIndex = prevCases.findIndex(c => c.caseNumber === newCaseNumber);
        if (existingCaseIndex >= 0) {
          // Update existing case
          const updatedCases = [...prevCases];
          updatedCases[existingCaseIndex] = {
            ...updatedCases[existingCaseIndex],
            photoCount: updatedCases[existingCaseIndex].photoCount + processed.length,
            processedCount: updatedCases[existingCaseIndex].processedCount + processed.length,
            thumbnails: [...updatedCases[existingCaseIndex].thumbnails, ...processed.map(photo => photo.uri)],
            photos: [...updatedCases[existingCaseIndex].photos, ...processed],
            lastUpdated: new Date().toISOString(),
          };
          return updatedCases;
        } else {
          // Add new case
          return [...prevCases, caseData];
        }
      });

      setCurrentCase(caseData);

      // Show final success message
      setBlockchainProof(prev => prev ? {
        ...prev,
        status: 'success',
        message: `All ${processed.length} photos successfully stored on blockchain!`,
        finalMessage: 'Your evidence is now permanently recorded on the blockchain with cryptographic proof.'
      } : null);

      setTimeout(() => {
        setShowBlockchainProof(false);
        setBlockchainProof(null);
        Alert.alert('Success', 'All photos processed and stored on blockchain!');
        setCurrentPage('caseDetails');
      }, 3000);

    } catch (error) {
      Alert.alert('Error', 'Failed to process photos');
      console.error('Processing error:', error);
      setShowBlockchainProof(false);
      setBlockchainProof(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadSingleEvidence = async (photo) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // Create a temporary file path
      const fileName = `evidence_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Copy the photo to the documents directory
      await FileSystem.copyAsync({
        from: photo.uri,
        to: fileUri,
      });

      setDownloadProgress(50);

      // Share the file
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Download Evidence: ${photo.name}`,
        });
      } else {
        Alert.alert('Download Complete', `Evidence saved to: ${fileUri}`);
      }

      setDownloadProgress(100);
      Alert.alert('Success', 'Evidence downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Error', 'Failed to download evidence file.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const downloadAllEvidence = async (caseId) => {
    try {
      const caseData = cases.find(c => c.id === caseId);
      if (!caseData || !caseData.photos || caseData.photos.length === 0) {
        Alert.alert('No Evidence', 'This case has no evidence to download.');
        return;
      }

      Alert.alert(
        'Download All Evidence',
        `Download all ${caseData.photos.length} evidence files for case "${caseData.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Download All', 
            onPress: async () => {
              try {
                setIsDownloading(true);
                setDownloadProgress(0);

                const totalPhotos = caseData.photos.length;
                const downloadPromises = caseData.photos.map(async (photo, index) => {
                  const fileName = `evidence_${caseData.caseNumber}_${index + 1}.jpg`;
                  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

                  await FileSystem.copyAsync({
                    from: photo.uri,
                    to: fileUri,
                  });

                  setDownloadProgress(((index + 1) / totalPhotos) * 100);
                });

                await Promise.all(downloadPromises);

                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                  // Share the first file as a representative
                  const firstFileUri = `${FileSystem.documentDirectory}evidence_${caseData.caseNumber}_1.jpg`;
                  await Sharing.shareAsync(firstFileUri, {
                    mimeType: 'image/jpeg',
                    dialogTitle: `Download All Evidence: ${caseData.title}`,
                  });
                }

                Alert.alert('Download Complete', `All ${totalPhotos} evidence files have been downloaded successfully!`);
              } catch (error) {
                console.error('Download error:', error);
                Alert.alert('Download Error', 'Failed to download evidence files.');
              } finally {
                setIsDownloading(false);
                setDownloadProgress(0);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Download all evidence error:', error);
      Alert.alert('Error', 'Failed to prepare download.');
    }
  };

  const viewPhoto = async (photo) => {
    setLoading(true);
    try {
      console.log('Viewing photo:', photo.id);
      
      // Retrieve JSON from blockchain
      const blockchainData = await retrieveFromBlockchain(photo.blockchainId);
      
      if (blockchainData) {
        console.log('Retrieved blockchain data, attempting backend retrieval');
        
        // Send JSON to backend to get photo back
        const response = await fetch(`${CONFIG.API_BASE_URL}/retrieve-photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonData: blockchainData.data,
            caseNumber: newCaseNumber,
          }),
        });

        console.log('Backend retrieval response status:', response.status);

        if (response.ok) {
          // In React Native, we don't use URL.createObjectURL
          // Instead, we can display the photo data or handle it differently
          const responseData = await response.json();
          console.log('Photo retrieval successful:', responseData);
          
          // Display the original photo that was stored
          setSelectedPhoto({
            uri: photo.uri,
            metadata: blockchainData.data.metadata,
            analysis: blockchainData.data.analysis,
            blockchainId: photo.blockchainId,
            hash: blockchainData.hash
          });
          setShowPhotoModal(true);
          
          Alert.alert('Photo Retrieved', 'Photo successfully retrieved from blockchain and backend!');
        } else {
          const errorText = await response.text();
          console.error('Backend retrieval error:', errorText);
          Alert.alert('Retrieval Error', 'Failed to retrieve photo from backend');
        }
      } else {
        console.log('No blockchain data available, using mock retrieval');
        // Display the original photo with mock data
        setSelectedPhoto({
          uri: photo.uri,
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
          blockchainId: photo.blockchainId,
          hash: `mock_hash_${Date.now()}`
        });
        setShowPhotoModal(true);
        Alert.alert('Photo Retrieved', 'Photo retrieved using mock data (development mode)');
      }
    } catch (error) {
      console.error('Photo retrieval error details:', {
        message: error.message,
        stack: error.stack,
        photoId: photo.id
      });
      Alert.alert('Error', 'Failed to retrieve photo');
    } finally {
      setLoading(false);
    }
  };

  const viewPhotoDirectly = (photo) => {
    const photoData = {
      uri: photo.uri,
      metadata: photo.jsonData?.metadata || {
        timestamp: new Date().toISOString(),
        location: 'Unknown',
        size: 'Unknown',
        format: 'JPEG',
      },
      analysis: photo.jsonData?.analysis || {
        objects: ['evidence'],
        confidence: 0.95,
      },
      blockchainId: photo.blockchainId,
      hash: photo.hash
    };
    
    setSelectedPhoto(photoData);
    animateModal(true);
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const resetApp = () => {
    setNewCaseNumber('');
    setPhotos([]);
    setProcessedPhotos([]);
    setCurrentPage('cases');
  };

  const deleteEvidence = (caseId, photoId) => {
    Alert.alert(
      'Delete Evidence',
      'Are you sure you want to delete this evidence? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            try {
              setCases(prevCases => 
                prevCases.map(caseItem => {
                  if (caseItem.id === caseId) {
                    return {
                      ...caseItem,
                      photos: caseItem.photos.filter(photo => photo.id !== photoId)
                    };
                  }
                  return caseItem;
                })
              );
              
              // Update current case if it's the one being viewed
              if (currentCase && currentCase.id === caseId) {
                setCurrentCase(prev => ({
                  ...prev,
                  photos: prev.photos.filter(photo => photo.id !== photoId)
                }));
              }
              
              Alert.alert('Success', 'Evidence deleted successfully.');
            } catch (error) {
              console.error('Delete evidence error:', error);
              Alert.alert('Error', 'Failed to delete evidence.');
            }
          }
        }
      ]
    );
  };

  const renderInputStep = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Evidence App</Text>
      <Text style={styles.subtitle}>Enter Case Information</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Case Number:</Text>
        <TextInput
          style={styles.input}
          value={newCaseNumber}
          onChangeText={setNewCaseNumber}
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
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPage('newCase')}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Photos</Text>
      </View>
      
      <Text style={styles.subtitle}>Case: {newCaseNumber}</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={selectPhotos}>
          <Ionicons name="images" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>Select Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
          <Ionicons name="camera" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>Take Photo</Text>
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

  const renderCaseDetails = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPage('cases')}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Case Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => downloadAllEvidence(currentCase.id)}
          >
            <Ionicons name="download" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.caseInfo}>
          <Text style={styles.caseTitle}>{currentCase.title}</Text>
          <Text style={styles.caseDescription}>{currentCase.description}</Text>
          <Text style={styles.caseDate}>Created: {new Date(currentCase.createdAt).toLocaleDateString()}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentCase.photos.length}</Text>
            <Text style={styles.statLabel}>Evidence Files</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{currentCase.photos.filter(p => p.blockchainId).length}</Text>
            <Text style={styles.statLabel}>Blockchain Verified</Text>
          </View>
        </View>

        <View style={styles.evidenceSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📸 Evidence Files</Text>
            <TouchableOpacity 
              style={styles.downloadAllButton}
              onPress={() => downloadAllEvidence(currentCase.id)}
            >
              <Ionicons name="download-outline" size={16} color="#007AFF" />
              <Text style={styles.downloadAllText}>Download All</Text>
            </TouchableOpacity>
          </View>

          {currentCase.photos.length === 0 ? (
            <View style={styles.noEvidenceContainer}>
              <Ionicons name="images-outline" size={48} color="#CCC" />
              <Text style={styles.noEvidenceText}>No evidence files yet</Text>
              <Text style={styles.noEvidenceSubtext}>Add photos to this case to see them here</Text>
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {currentCase.photos.map((photo, index) => (
                <View key={photo.id} style={styles.photoCard}>
                  <View style={styles.photoHeader}>
                    <Text style={styles.photoName} numberOfLines={1}>
                      {photo.name || `Evidence ${index + 1}`}
                    </Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteEvidence(currentCase.id, photo.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.photoThumbnail}>
                    <Ionicons name="image" size={32} color="#007AFF" />
                  </View>
                  
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => viewPhotoDirectly(photo)}
                    >
                      <Ionicons name="eye-outline" size={16} color="#007AFF" />
                      <Text style={styles.actionText}>View</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => retrievePhoto(photo)}
                    >
                      <Ionicons name="download-outline" size={16} color="#34C759" />
                      <Text style={styles.actionText}>Retrieve</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {photo.blockchainId && (
                    <View style={styles.blockchainBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#34C759" />
                      <Text style={styles.blockchainText}>Verified</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderBackendStatus = () => {
    let statusText = '';
    let statusColor = '#666';
    
    switch (backendStatus) {
      case 'checking':
        statusText = 'Checking backend...';
        statusColor = '#FFA500';
        break;
      case 'connected':
        statusText = 'Backend connected';
        statusColor = '#4CAF50';
        break;
      case 'disconnected':
        statusText = 'Backend disconnected (using mock data)';
        statusColor = '#F44336';
        break;
    }
    
    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      </View>
    );
  };

  const renderCasesList = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photo Evidence Cases</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setCurrentPage('newCase')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Manage your evidence cases</Text>
      
      {cases.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No cases yet</Text>
          <Text style={styles.emptySubtext}>Create your first case to get started</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentPage('newCase')}>
            <Text style={styles.buttonText}>Create First Case</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.caseItem}
              onPress={() => {
                setCurrentCase(item);
                setCurrentPage('caseDetails');
              }}
            >
              <View style={styles.caseHeader}>
                <Text style={styles.caseNumber}>Case #{item.caseNumber}</Text>
                <Text style={styles.caseDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={styles.caseStats}>
                <View style={styles.statItem}>
                  <Ionicons name="images" size={16} color="#007AFF" />
                  <Text style={styles.statText}>{item.photoCount} Photos</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.statText}>{item.processedCount} Processed</Text>
                </View>
              </View>
              <View style={styles.caseThumbnails}>
                {item.thumbnails?.slice(0, 3).map((thumbnail, index) => (
                  <Image key={index} source={{ uri: thumbnail }} style={styles.thumbnail} />
                ))}
                {item.photoCount > 3 && (
                  <View style={styles.moreIndicator}>
                    <Text style={styles.moreText}>+{item.photoCount - 3}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderNewCase = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentPage('cases')}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>New Case</Text>
      </View>
      
      <Text style={styles.subtitle}>Create a new evidence case</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Case Number</Text>
        <TextInput
          style={styles.input}
          value={newCaseNumber}
          onChangeText={setNewCaseNumber}
          placeholder="Enter case number"
          placeholderTextColor="#999"
        />
      </View>
      
      <TouchableOpacity style={styles.primaryButton} onPress={handleCaseSubmit}>
        <Text style={styles.buttonText}>Create Case & Add Photos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBlockchainProofModal = () => {
    if (!showBlockchainProof || !blockchainProof) return null;

    const getStatusColor = () => {
      switch (blockchainProof.status) {
        case 'processing':
        case 'sending':
        case 'mining':
          return '#FFA500';
        case 'confirmed':
        case 'success':
          return '#4CAF50';
        case 'error':
          return '#F44336';
        default:
          return '#666';
      }
    };

    const getStatusIcon = () => {
      switch (blockchainProof.status) {
        case 'processing':
        case 'sending':
        case 'mining':
          return 'sync';
        case 'confirmed':
        case 'success':
          return 'checkmark-circle';
        case 'error':
          return 'close-circle';
        default:
          return 'information-circle';
      }
    };

    return (
      <Modal
        visible={showBlockchainProof}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBlockchainProof(false)}
      >
        <View style={styles.blockchainProofContainer}>
          <View style={styles.blockchainProofContent}>
            <View style={styles.blockchainProofHeader}>
              <Ionicons 
                name={getStatusIcon()} 
                size={32} 
                color={getStatusColor()} 
              />
              <Text style={styles.blockchainProofTitle}>Blockchain Proof</Text>
            </View>

            <View style={styles.blockchainProofBody}>
              <Text style={styles.blockchainProofMessage}>
                {blockchainProof.message}
              </Text>

              {blockchainProof.currentPhoto && (
                <Text style={styles.blockchainProofProgress}>
                  Photo {blockchainProof.currentPhoto} of {blockchainProof.totalPhotos}
                </Text>
              )}

              <View style={styles.blockchainProofDetails}>
                <View style={styles.proofDetail}>
                  <Text style={styles.proofLabel}>Case Number:</Text>
                  <Text style={styles.proofValue}>{blockchainProof.caseNumber}</Text>
                </View>

                <View style={styles.proofDetail}>
                  <Text style={styles.proofLabel}>Hash:</Text>
                  <Text style={styles.proofValue} numberOfLines={1}>
                    {blockchainProof.hash ? `${blockchainProof.hash.substring(0, 20)}...` : 'N/A'}
                  </Text>
                </View>

                {blockchainProof.transactionHash && (
                  <View style={styles.proofDetail}>
                    <Text style={styles.proofLabel}>Transaction Hash:</Text>
                    <Text style={styles.proofValue} numberOfLines={1}>
                      {blockchainProof.transactionHash.substring(0, 20)}...
                    </Text>
                  </View>
                )}

                {blockchainProof.blockNumber && (
                  <View style={styles.proofDetail}>
                    <Text style={styles.proofLabel}>Block Number:</Text>
                    <Text style={styles.proofValue}>{blockchainProof.blockNumber}</Text>
                  </View>
                )}

                {blockchainProof.gasUsed && (
                  <View style={styles.proofDetail}>
                    <Text style={styles.proofLabel}>Gas Used:</Text>
                    <Text style={styles.proofValue}>{blockchainProof.gasUsed}</Text>
                  </View>
                )}

                <View style={styles.proofDetail}>
                  <Text style={styles.proofLabel}>Timestamp:</Text>
                  <Text style={styles.proofValue}>
                    {new Date(blockchainProof.timestamp).toLocaleString()}
                  </Text>
                </View>
              </View>

              {blockchainProof.finalMessage && (
                <View style={styles.finalMessageContainer}>
                  <Text style={styles.finalMessage}>{blockchainProof.finalMessage}</Text>
                </View>
              )}

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
            </View>

            {blockchainProof.status === 'error' && (
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowBlockchainProof(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {currentPage === 'cases' && renderCasesList()}
      {currentPage === 'newCase' && renderNewCase()}
      {currentPage === 'upload' && renderUploadStep()}
      {currentPage === 'caseDetails' && renderCaseDetails()}
      
      {renderBackendStatus()}
      
      {/* Download Progress Overlay */}
      {isDownloading && (
        <View style={styles.downloadOverlay}>
          <View style={styles.downloadModal}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.downloadText}>Downloading Evidence...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(downloadProgress)}%</Text>
          </View>
        </View>
      )}
      
      {/* Blockchain Proof Modal */}
      {renderBlockchainProofModal()}
      
      {/* Enhanced Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <Modal
          visible={showPhotoModal}
          animationType="none"
          transparent={true}
          onRequestClose={() => animateModal(false)}
        >
          <Animated.View 
            style={[
              styles.modalContainer,
              { opacity: modalOpacity }
            ]}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                { transform: [{ scale: modalScale }] }
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Evidence Details</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => animateModal(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.imageContainer}>
                  {selectedPhoto.uri ? (
                    <Image 
                      source={{ uri: selectedPhoto.uri }} 
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.noImageContainer}>
                      <Ionicons name="image-outline" size={64} color="#CCC" />
                      <Text style={styles.noImageText}>No image available</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.photoInfo}>
                  <View style={styles.infoSection}>
                    <View style={styles.infoSectionHeader}>
                      <Ionicons name="information-circle" size={20} color="#007AFF" />
                      <Text style={styles.infoTitle}>Metadata</Text>
                    </View>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Timestamp</Text>
                        <Text style={styles.infoValue}>
                          {selectedPhoto?.metadata?.timestamp ? 
                            new Date(selectedPhoto.metadata.timestamp).toLocaleString() : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Location</Text>
                        <Text style={styles.infoValue}>{selectedPhoto?.metadata?.location || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Size</Text>
                        <Text style={styles.infoValue}>{selectedPhoto?.metadata?.size || 'N/A'}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Format</Text>
                        <Text style={styles.infoValue}>{selectedPhoto?.metadata?.format || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.infoSection}>
                    <View style={styles.infoSectionHeader}>
                      <Ionicons name="search" size={20} color="#007AFF" />
                      <Text style={styles.infoTitle}>Analysis</Text>
                    </View>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Objects Detected</Text>
                        <Text style={styles.infoValue}>
                          {selectedPhoto?.analysis?.objects?.join(', ') || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Confidence</Text>
                        <Text style={styles.infoValue}>
                          {selectedPhoto?.analysis?.confidence ? 
                            `${(selectedPhoto.analysis.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.infoSection}>
                    <View style={styles.infoSectionHeader}>
                      <Ionicons name="link" size={20} color="#007AFF" />
                      <Text style={styles.infoTitle}>Blockchain</Text>
                    </View>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Blockchain ID</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                          {selectedPhoto?.blockchainId || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Hash</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                          {selectedPhoto?.hash ? `${selectedPhoto.hash.substring(0, 20)}...` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalActionButton}
                    onPress={() => downloadSingleEvidence(selectedPhoto)}
                  >
                    <Ionicons name="download" size={20} color="#FFF" />
                    <Text style={styles.modalActionText}>Download Evidence</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#E1E5E9',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadContainer: {
    flex: 1,
  },
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  uploadButton: {
    flex: 0.48,
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  photosContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 4,
  },
  photosScroll: {
    marginBottom: 20,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  caseInfo: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  caseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  caseDetails: {
    flex: 1,
  },
  caseTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  caseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  caseDate: {
    fontSize: 12,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 0.48,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  evidenceSection: {
    flex: 1,
  },
  downloadAllButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadAllText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noEvidenceContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noEvidenceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  noEvidenceSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  photosGrid: {
    flex: 1,
  },
  photoCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  photoThumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    flex: 0.48,
    justifyContent: 'center',
  },
  actionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  blockchainBadge: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  blockchainText: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  caseItem: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  caseNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  caseDate: {
    fontSize: 14,
    color: '#666',
  },
  caseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  caseThumbnails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 8,
  },
  moreIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  moreText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  casesList: {
    paddingBottom: 20,
  },
  downloadButton: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 8,
  },
  modalScrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  photoInfo: {
    flex: 1,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  infoGrid: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  modalActions: {
    marginTop: 20,
  },
  modalActionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadModal: {
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  downloadText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#007AFF',
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
  },
  blockchainProofContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockchainProofContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  blockchainProofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  blockchainProofTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  blockchainProofBody: {
    flex: 1,
  },
  blockchainProofMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  blockchainProofProgress: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  blockchainProofDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  proofDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  proofLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  proofValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  finalMessageContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  finalMessage: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '600',
  },
});