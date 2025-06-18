import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, TouchableOpacity, View } from 'react-native';

export default function PhotoModal({ visible, photo, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 40, right: 24, zIndex: 2 }}>
          <Ionicons name="close-circle" size={40} color="#FFF" />
        </TouchableOpacity>
        {photo && (
          <Image source={{ uri: photo.url || photo.uri }} style={{ width: 320, height: 320, borderRadius: 16, resizeMode: 'contain', backgroundColor: '#222' }} />
        )}
      </View>
    </Modal>
  );
} 