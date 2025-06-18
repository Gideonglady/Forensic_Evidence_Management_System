import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

export default function CaseDetails({
  caseData,
  evidenceFiles,
  onViewEvidence,
  onDownloadEvidence,
  onDeleteEvidence,
  onBack,
  onAddPhoto
}) {
  if (!caseData) return null;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
        <Ionicons name="arrow-back" size={28} color="#007AFF" />
      </TouchableOpacity>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>Case #{caseData.caseNumber}</Text>
          <Text style={{ fontSize: 16, color: '#666' }}>Created: {new Date(caseData.createdAt).toLocaleString()}</Text>
        </View>
        <TouchableOpacity 
          onPress={onAddPhoto}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: '#007AFF', 
            paddingHorizontal: 16, 
            paddingVertical: 12, 
            borderRadius: 12 
          }}
        >
          <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '600' }}>Add Photo</Text>
        </TouchableOpacity>
      </View>
      
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
                  <TouchableOpacity onPress={() => onDownloadEvidence(item)} style={{ marginRight: 16 }}>
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
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
} 