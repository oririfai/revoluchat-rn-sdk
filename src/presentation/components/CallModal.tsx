import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useCallControls } from '../hooks/useCallControls';
import { useRevoluchat } from '../RevoluchatProvider';

const { width, height } = Dimensions.get('window');

/**
 * Professional Call UI Modal.
 * Handles Dialing, Incoming, and Connected states.
 */
export const CallModal: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isLoudspeaker,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleLoudspeaker,
    cleanup,
    isProcessing,
  } = useCallControls();

  const { theme, userId } = useRevoluchat();
  const currentUserId = userId ? parseInt(userId) : 0;

  if (!activeCall) return null;

  // Debug log for metadata
  console.log('[CallModal] activeCall state:', activeCall);

  const isCaller = activeCall.callerId === currentUserId;
  const isIncoming = !isCaller;
  const showIncomingControls = isIncoming && activeCall.status === 'dialing';
  
  const isVideo = activeCall.type === 'video';

  return (
    <Modal visible={!!activeCall} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        
        {/* Remote Video (Full Screen) */}
        {remoteStream && isVideo && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}
        {!isVideo && (
          <View style={styles.avatarPlaceholder}>
             <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>
                    {isCaller ? activeCall.receiverName?.charAt(0) : activeCall.callerName?.charAt(0) || '?'}
                </Text>
              <Text style={{ fontSize: 10, color: "#999", textAlign: "center", marginTop: 4 }}>Store: {activeCall.status}</Text>
             </View>
             <Text style={[styles.callerName, { color: theme.colors.text }]}>
                {(isIncoming ? activeCall.callerName : activeCall.receiverName) || 'Unknown User'}
             </Text>
             <Text style={[styles.callStatus, { color: theme.colors.textSecondary }]}>
                {activeCall.status === 'dialing' ? 'Menghubungi...' : 
                 activeCall.status === 'ringing' ? 'Berdering...' :
                 activeCall.status === 'connected' ? 'Terhubung' : 'Panggilan...'}
             </Text>
          </View>
        )}

        {/* Local Video (Small Overlay) */}
        {isVideo && localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
            />
          </View>
        )}

        {/* Controls Overlay */}
        <SafeAreaView style={styles.controlsContainer}>
          <View style={styles.topInfo}>
             <Text style={styles.videoOverlayName}>
                {isIncoming ? 'Panggilan Masuk' : 'Panggilan Keluar'}
             </Text>
             <Text style={[styles.callerName, { color: '#FFF', marginTop: 10 }]}>
                {(isIncoming ? activeCall.callerName : activeCall.receiverName) || 'Unknown User'}
             </Text>
          </View>

          <View style={styles.bottomControls}>
            {showIncomingControls ? (
               // INCOMING CALL UI
               <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]} 
                    onPress={rejectCall}
                  >
                    <Text style={styles.buttonIcon}>✖</Text>
                    <Text style={styles.buttonLabel}>Tolak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.speakerButton, isLoudspeaker && styles.activeButton]} 
                    onPress={toggleLoudspeaker}
                  >
                    <Text style={[styles.buttonIcon, isLoudspeaker && styles.activeButtonText]}>{isLoudspeaker ? '🔊' : '🔈'}</Text>
                    <Text style={[styles.buttonLabel, isLoudspeaker && styles.activeButtonText]}>Speaker</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton, isProcessing && { opacity: 0.5 }]} 
                    onPress={acceptCall}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonIcon}>✔</Text>}
                    <Text style={styles.buttonLabel}>Terima</Text>
                  </TouchableOpacity>
               </View>
            ) : (
               // OUTGOING / ACTIVE CALL UI
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.secondaryButton, isMuted && styles.activeButton]} 
                    onPress={toggleMute}
                  >
                    <Text style={[styles.buttonIcon, isMuted && styles.activeButtonText]}>{isMuted ? '🎙️' : '🔇'}</Text>
                    <Text style={[styles.buttonLabel, isMuted && styles.activeButtonText]}>Mute</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.hangupButton]} 
                    onPress={hangup}
                  >
                    <Text style={styles.buttonIcon}>📞</Text>
                    <Text style={styles.buttonLabel}>Tutup</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.secondaryButton, isLoudspeaker && styles.activeButton]} 
                    onPress={toggleLoudspeaker}
                  >
                    <Text style={[styles.buttonIcon, isLoudspeaker && styles.activeButtonText]}>{isLoudspeaker ? '🔊' : '🔈'}</Text>
                    <Text style={[styles.buttonLabel, isLoudspeaker && styles.activeButtonText]}>Speaker</Text>
                  </TouchableOpacity>
               </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222',
    elevation: 5,
    borderWidth: 1,
    borderColor: '#444',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
  avatarText: {
      fontSize: 48,
      color: '#FFF',
      fontWeight: 'bold',
  },
  activeButtonIcon: {
    color: '#000',
  },
  callerName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    letterSpacing: 1.2,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 20,
  },
  topInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  videoOverlayName: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '600',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: -1, height: 1 },
      textShadowRadius: 10,
  },
  bottomControls: {
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  speakerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeButton: {
    backgroundColor: '#FFF',
  },
  activeButtonText: {
    color: '#000',
  },
  hangupButton: {
    backgroundColor: '#F44336',
    transform: [{ rotate: '135deg' }], // Standard hangup icon angle
  },
  buttonIcon: {
    color: '#FFF',
    fontSize: 24,
    marginBottom: 2,
  },
  buttonLabel: {
      color: '#FFF',
      fontSize: 12,
      position: 'absolute',
      bottom: -25,
      fontWeight: '600',
  }
});
