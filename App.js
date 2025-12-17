import React, { useEffect, useState } from 'react';
import { Alert, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CaseDetails from './components/CaseDetails';
import CaseList from './components/CaseList';
import NewCaseForm from './components/NewCaseForm';
import PhotoCapture from './components/PhotoCapture';
import PhotoModal from './components/PhotoModal';
import { createCase, deleteEvidenceFile, fetchCases, fetchEvidenceFiles } from './utils/api';

export default function App() {
  const [cases, setCases] = useState([]);
  const [currentPage, setCurrentPage] = useState('caseList');
  const [currentCase, setCurrentCase] = useState(null);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [loadingNewCase, setLoadingNewCase] = useState(false);

  useEffect(() => {
    fetchCases().then(data => setCases(data.cases || []));
  }, []);

  useEffect(() => {
    if (currentPage === 'caseDetails' && currentCase) {
      fetchEvidenceFiles(currentCase.caseNumber).then(data => setEvidenceFiles(data.files || []));
    }
  }, [currentPage, currentCase]);

  const handleSelectCase = (caseData) => {
    setCurrentCase(caseData);
    setCurrentPage('caseDetails');
  };

  const handleBack = () => {
    setCurrentPage('caseList');
    setCurrentCase(null);
    setEvidenceFiles([]);
  };

  const handleViewEvidence = (file) => {
    setSelectedPhoto(file);
    setShowPhotoModal(true);
  };

  const handleDownloadEvidence = (file) => {
    // Implement download logic (e.g., using FileSystem or Share)
    Alert.alert('Download', `Download: ${file.filename}`);
  };

  const handleDeleteEvidence = async (file) => {
    const res = await deleteEvidenceFile(file.filename);
    if (res.status === 'success') {
      setEvidenceFiles(evidenceFiles.filter(f => f.filename !== file.filename));
    } else {
      Alert.alert('Error', res.message || 'Failed to delete file');
    }
  };

  const handleNewCase = () => setShowNewCaseForm(true);

  const handleCreateCase = async ({ caseNumber, description }) => {
    setLoadingNewCase(true);
    try {
      const res = await createCase({ caseNumber, description });
      if (res.status === 'success') {
        setCases([...cases, res.case]);
        setShowNewCaseForm(false);
      } else if (res.status === 'error' && res.message && res.message.includes('already exists')) {
        Alert.alert('Duplicate Case Number', res.message);
      } else {
        Alert.alert('Error', res.message || 'Failed to create case');
      }
    } catch (error) {
      if (error.status === 409) {
        Alert.alert('Duplicate Case Number', 'A case with this number already exists. Please use a unique case number.');
      } else {
        console.error('Error creating case:', error);
        Alert.alert('Error', 'Failed to create case. Please try again.');
      }
    } finally {
      setLoadingNewCase(false);
    }
  };

  const handleAddPhoto = () => {
    if (!currentCase) return;
    setShowPhotoCapture(true);
  };

  const handlePhotoUploaded = (uploadResult) => {
    // Refresh evidence files after upload
    if (currentCase) {
      fetchEvidenceFiles(currentCase.caseNumber).then(data => setEvidenceFiles(data.files || []));
    }
    // Show simple success message
    Alert.alert(
      'Photo Uploaded Successfully!',
      'Evidence uploaded successfully.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
        <StatusBar barStyle="dark-content" />
      {currentPage === 'caseList' && (
        <CaseList cases={cases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} />
      )}
      {currentPage === 'caseDetails' && currentCase && (
        <CaseDetails
          caseData={currentCase}
          evidenceFiles={evidenceFiles}
          onViewEvidence={handleViewEvidence}
          onDownloadEvidence={handleDownloadEvidence}
          onDeleteEvidence={handleDeleteEvidence}
          onBack={handleBack}
          onAddPhoto={handleAddPhoto}
        />
      )}
      <PhotoModal visible={showPhotoModal} photo={selectedPhoto} onClose={() => setShowPhotoModal(false)} />
      <NewCaseForm visible={showNewCaseForm} onCreate={handleCreateCase} onCancel={() => setShowNewCaseForm(false)} loading={loadingNewCase} />
      <PhotoCapture 
        visible={showPhotoCapture} 
        caseNumber={currentCase?.caseNumber} 
        onClose={() => setShowPhotoCapture(false)}
        onPhotoUploaded={handlePhotoUploaded}
      />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}