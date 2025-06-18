import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NewCaseForm({ visible, onCreate, onCancel, loading }) {
  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!caseNumber.trim()) return;
    onCreate({ caseNumber, description });
    setCaseNumber('');
    setDescription('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: 320 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Create New Case</Text>
          <TextInput
            placeholder="Case Number"
            value={caseNumber}
            onChangeText={setCaseNumber}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 12 }}
          />
          <TextInput
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginBottom: 20 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onCancel} style={{ marginRight: 16 }}>
              <Text style={{ color: '#666', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} disabled={loading} style={{ backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
} 