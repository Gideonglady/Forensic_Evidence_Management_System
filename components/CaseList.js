import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

export default function CaseList({ cases, onSelectCase, onNewCase }) {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>Photo Evidence Cases</Text>
        <TouchableOpacity style={{ padding: 8, borderRadius: 8, backgroundColor: '#007AFF', marginLeft: 'auto' }} onPress={onNewCase}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 16, color: '#666', fontWeight: '400' }}>Manage your evidence cases</Text>
      {cases.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Ionicons name="folder-outline" size={64} color="#CCC" />
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginTop: 16, marginBottom: 8 }}>No cases yet</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 }}>Create your first case to get started</Text>
          <TouchableOpacity style={{ backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 20 }} onPress={onNewCase}>
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Create First Case</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
              onPress={() => onSelectCase(item)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 12 }}>Case #{item.caseNumber}</Text>
                <Text style={{ fontSize: 14, color: '#666' }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="images" size={16} color="#007AFF" />
                <Text style={{ fontSize: 14, color: '#007AFF', marginLeft: 4 }}>{item.photoCount} Photos</Text>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginLeft: 16 }} />
                <Text style={{ fontSize: 14, color: '#4CAF50', marginLeft: 4 }}>{item.processedCount} Processed</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                {item.thumbnails?.slice(0, 3).map((thumbnail, index) => (
                  <Image key={index} source={{ uri: thumbnail }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 8 }} />
                ))}
                {item.photoCount > 3 && (
                  <View style={{ backgroundColor: '#EEE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: '#666', fontWeight: '600' }}>+{item.photoCount - 3}</Text>
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
} 