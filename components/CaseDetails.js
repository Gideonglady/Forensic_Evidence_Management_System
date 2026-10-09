import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Image, Text, TouchableOpacity, View, ActivityIndicator, Share, PermissionsAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { aiAnalyzeCase, downloadReport, getMerkleProof, getMerkleRoot, downloadAllEvidence, deleteCase } from '../utils/api';
import * as Crypto from 'expo-crypto';

export default function CaseDetails({
  caseData,
  evidenceFiles,
  onViewEvidence,
  onDownloadEvidence,
  onDeleteEvidence,
  onBack,
  onAddPhoto
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reportFilename, setReportFilename] = useState(null);
  const [downloading, setDownloading] = useState(false);

  if (!caseData) return null;

  // Request permissions for saving files
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission",
            message: "This app needs access to storage to save files.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // iOS doesn't need explicit permission for this
      return true;
    }
  };

  // Save file to user's accessible storage
  const saveFileToStorage = async (fileUri, filename, fileType = 'image') => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permission is required to save files.');
        return false;
      }

      // Create a temporary file in the app's cache
      const tempUri = `${FileSystem.cacheDirectory}${filename}`;

      // Copy the file to cache first
      await FileSystem.copyAsync({
        from: fileUri,
        to: tempUri
      });

      // Save to media library (for images) or share (for other files)
      if (fileType === 'image') {
        try {
          const asset = await MediaLibrary.createAssetAsync(tempUri);
          await MediaLibrary.createAlbumAsync('PhotoEvidence', asset, false);
          console.log(`File saved to PhotoEvidence album: ${filename}`);
          return true;
        } catch (mediaError) {
          console.error('Media library error:', mediaError);
          // Fallback to sharing if media library fails
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(tempUri, {
              mimeType: 'image/jpeg',
              dialogTitle: `Save ${filename}`,
              UTI: 'public.jpeg'
            });
            return true;
          }
          return false;
        }
      } else {
        // For non-image files, use sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempUri, {
            mimeType: 'application/octet-stream',
            dialogTitle: `Save ${filename}`,
            UTI: 'public.data'
          });
          return true;
        } else {
          Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
          return false;
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file to storage.');
      return false;
    }
  };

  const handleAIAnalysis = async () => {
    if (!evidenceFiles || evidenceFiles.length === 0) {
      Alert.alert('No Evidence', 'Please add some evidence files before running AI analysis.');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await aiAnalyzeCase(caseData.caseNumber);

      if (result.status === 'success') {
        setAnalysisResult(result.analysis);
        setReportFilename(result.report_filename);
        Alert.alert(
          'AI Analysis Complete',
          `Analysis completed successfully!\n\nFiles analyzed: ${result.case_files_analyzed.length}\nConfidence: ${(result.analysis.confidence * 100).toFixed(1)}%\nMode: ${result.analysis.mode === 'ai' ? 'Full AI' : 'Basic'}\n\nWould you like to download the report?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download Report', onPress: handleDownloadReport }
          ]
        );
      } else {
        Alert.alert('Analysis Failed', result.message || 'Failed to complete AI analysis');
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      Alert.alert('Error', 'Failed to perform AI analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportFilename) {
      Alert.alert('No Report', 'No report available for download. Please run AI Analysis first.');
      return;
    }

    try {
      setDownloading(true);
      const response = await downloadReport(reportFilename);

      if (response.ok) {
        const text = await response.text();

        // Save to cache first
        const tempUri = `${FileSystem.cacheDirectory}${reportFilename}`;
        await FileSystem.writeAsStringAsync(tempUri, text, {
          encoding: 'utf8',  // Changed from FileSystem.EncodingType.UTF8
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(tempUri, {
            mimeType: 'text/plain',
            dialogTitle: `Save Forensic Report - ${caseData.caseNumber}`,
            UTI: 'public.plain-text'
          });

          Alert.alert(
            'Report Ready',
            'The forensic report is ready to be saved. Use the share dialog to save it to your preferred location.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        }
      } else {
        Alert.alert('Download Failed', 'Failed to download the report.');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', `Failed to download report: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleBulkDownload = async () => {
    if (!evidenceFiles || evidenceFiles.length === 0) {
      Alert.alert('No Evidence', 'No evidence files to download.');
      return;
    }

    try {
      setDownloading(true);
      Alert.alert(
        'Download All Evidence',
        `This will download ${evidenceFiles.length} evidence files as a ZIP archive. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              try {
                const response = await downloadAllEvidence(caseData.caseNumber);
                if (!response.ok) throw new Error('Download failed');

                const blob = await response.blob();
                // Convert blob to base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                  const base64data = reader.result.split(',')[1];
                  const tempUri = `${FileSystem.cacheDirectory}evidence_${caseData.caseNumber}.zip`;
                  await FileSystem.writeAsStringAsync(tempUri, base64data, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  // Share the zip file
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(tempUri, {
                      mimeType: 'application/zip',
                      dialogTitle: `Evidence Files - Case ${caseData.caseNumber}`,
                      UTI: 'public.zip-archive'
                    });
                    Alert.alert('Success', 'Evidence files downloaded successfully.');
                  } else {
                    Alert.alert('Error', 'Sharing is not available on this device.');
                  }
                  setDownloading(false);
                };
                reader.onerror = (error) => {
                  console.error('Bulk download error:', error);
                  Alert.alert('Error', 'Failed to download evidence files.');
                  setDownloading(false);
                };
                reader.readAsDataURL(blob);
              } catch (error) {
                console.error('Bulk download error:', error);
                Alert.alert('Error', 'Failed to download evidence files.');
                setDownloading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Bulk download error:', error);
      Alert.alert('Error', 'Failed to initiate download.');
      setDownloading(false);
    }
  };

  const handleDownloadSingleEvidence = async (file) => {
    try {
      const response = await fetch(file.url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Create temporary file
        const tempUri = `${FileSystem.cacheDirectory}${file.filename}`;
        const base64 = btoa(String.fromCharCode(...uint8Array));
        await FileSystem.writeAsStringAsync(tempUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Save to media library
        const saved = await saveFileToStorage(tempUri, file.filename, 'image');
        if (saved) {
          Alert.alert('Success', `${file.filename} has been saved to your device.`);
        }
      } else {
        Alert.alert('Download Failed', 'Failed to download the file.');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file.');
    }
  };

  const handleVerifyEvidence = async (file) => {
    try {
      // Use the salted hash from backend (should be stored in file.hash or file.saltedHash)
      const saltedHash = file.hash || file.saltedHash;
      if (!saltedHash) {
        Alert.alert('Verification Error', 'No salted hash found for this evidence.');
        return;
      }
      // Double-hash: Merkle tree uses SHA256(saltedHash)
      const leaf = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltedHash
      );
      console.log(`[VERIFY] Salted hash: ${saltedHash}`);
      console.log(`[VERIFY] Leaf for verification (SHA256): ${leaf}`);
      // Get Merkle proof and root
      const proofRes = await getMerkleProof(caseData.caseNumber, leaf);
      const rootRes = await getMerkleRoot(caseData.caseNumber);
      if (proofRes.status === 'success' && rootRes.status === 'success') {
        Alert.alert('Verification', `Evidence is included in the Merkle tree.\nMerkle Root: ${rootRes.merkle_root}`);
      } else {
        Alert.alert('Verification Failed', 'Evidence not found or error occurred.');
      }
    } catch (error) {
      Alert.alert('Verification Error', error.message || 'Could not verify evidence.');
    }
  };

  const handleDeleteCase = async () => {
    Alert.alert(
      'Delete Case',
      'Are you sure you want to delete this case? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteCase(caseData.caseNumber);
              if (result.status === 'success') {
                Alert.alert('Success', 'Case deleted successfully');
                onBack(); // Go back to case list
              } else {
                Alert.alert('Error', result.message || 'Failed to delete case');
              }
            } catch (error) {
              console.error('Delete case error:', error);
              Alert.alert('Error', 'Failed to delete case');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', elevation: 2 }}>
        <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={{ marginLeft: 8, fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteCase} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="trash-outline" size={24} color="#ff3b30" />
          <Text style={{ marginLeft: 8, fontSize: 16, color: '#ff3b30' }}>Delete Case</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>Case #{caseData.caseNumber}</Text>
          <Text style={{ fontSize: 16, color: '#666' }}>Created: {new Date(caseData.createdAt).toLocaleString()}</Text>
        </View>

        {/* Action Buttons Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={handleAIAnalysis}
            disabled={analyzing}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: analyzing ? '#999' : '#FF6B35',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              marginBottom: 8,
              minWidth: 120
            }}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="analytics" size={18} color="#FFF" style={{ marginRight: 6 }} />
            )}
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>
              {analyzing ? 'Analyzing...' : 'AI Analysis'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBulkDownload}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#4CAF50',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              marginBottom: 8,
              minWidth: 120
            }}
          >
            <Ionicons name="download-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Download All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onAddPhoto}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#007AFF',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 8,
              minWidth: 120
            }}
          >
            <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {analysisResult && (
          <View style={{ backgroundColor: '#F0F8FF', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#007AFF' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>AI Analysis Results</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
              Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              Files Analyzed: {evidenceFiles.length}
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              Mode: {analysisResult.mode === 'ai' ? 'Full AI Analysis' : 'Basic Analysis'}
            </Text>
            {reportFilename && (
              <TouchableOpacity
                onPress={handleDownloadReport}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  alignSelf: 'flex-start'
                }}
              >
                <Ionicons name="download" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Download Report</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Evidence Files</Text>
        {(!evidenceFiles || evidenceFiles.length === 0) ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="images" size={64} color="#CCC" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#999', fontSize: 16, textAlign: 'center' }}>No evidence files for this case.</Text>
            <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', marginTop: 8 }}>Tap "Add Photo" to capture evidence</Text>
          </View>
        ) : (
          <FlatList
            data={evidenceFiles}
            keyExtractor={(item) => item.filename}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
                <Image source={{ uri: item.url }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#EEE' }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>{item.filename}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6 }}>
                    <TouchableOpacity onPress={() => onViewEvidence(item)} style={{ marginRight: 16 }}>
                      <Ionicons name="eye" size={22} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDownloadSingleEvidence(item)} style={{ marginRight: 16 }}>
                      <Ionicons name="download" size={22} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete Evidence', 'Are you sure you want to delete this file?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDeleteEvidence(item) }
                      ]);
                    }}>
                      <Ionicons name="trash" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleVerifyEvidence(item)} style={{ marginLeft: 8, backgroundColor: '#28a745', borderRadius: 6, padding: 6 }}>
                      <Text style={{ color: '#FFF', fontWeight: '600' }}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
} 