import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useCallContext } from '../CallProvider';
import { useRevoluchat } from '../RevoluchatProvider';
import { 
  PhoneIcon, 
  VideoIcon, 
  FlipIcon, 
  MicOffIcon, 
  SpeakerIcon,
} from './Icons';

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
    isVideoEnabled,
    callDuration,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleLoudspeaker,
    toggleVideo,
    switchCamera,
    isProcessing,
    remoteStreamKey,
  } = useCallContext();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const { theme, userId } = useRevoluchat();
  const currentUserId = userId ? parseInt(userId) : 0;

  if (!activeCall) return null;

  const isCaller = activeCall.callerId === currentUserId;
  const isIncoming = !isCaller;
  const isVideo = activeCall.type === 'video';
  const isConnected = activeCall.status === 'connected';
  const isEndState = activeCall.status === 'rejected' || activeCall.status === 'completed';
  const showIncomingControls = isIncoming && (activeCall.status === 'dialing' || activeCall.status === 'ringing') && !isEndState;

  const getStatusText = () => {
    if (activeCall.status === 'rejected') return 'Panggilan ditolak';
    if (activeCall.status === 'completed') return 'Panggilan diakhiri';
    if (activeCall.status === 'connected') return 'Tersambung';
    
    if (isCaller) {
      if (activeCall.status === 'dialing') return 'Memanggil...';
      if (activeCall.status === 'ringing') return 'Berdering...';
    } else {
      if (activeCall.status === 'dialing' || activeCall.status === 'ringing') return 'Panggilan Masuk';
    }
    
    return 'Panggilan...';
  };

  return (
    <Modal visible={!!activeCall} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        
        {/* Remote Video (Full Screen) */}
        {remoteStream && isVideo && (
          <RTCView
            key={`remote-${remoteStreamKey}`}
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            zOrder={0}
          />
        )}

        {/* Audio / Neutral State Overlay */}
        {(!isVideo || !remoteStream) && (
          <View style={styles.avatarPlaceholder}>
             <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                {activeCall.callerPhoto ? (
                  <Image source={{ uri: activeCall.callerPhoto }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {isCaller ? activeCall.receiverName?.charAt(0) : activeCall.callerName?.charAt(0) || '?'}
                  </Text>
                )}
             </View>
             <Text style={[styles.callerName, { color: theme.colors.text }]}>
                {(isIncoming ? activeCall.callerName : activeCall.receiverName) || 'Unknown User'}
             </Text>
             <Text style={[styles.callStatus, { color: theme.colors.textSecondary }]}>
                {getStatusText()}
             </Text>
             {isConnected && (
                <Text style={[styles.callDuration, { color: theme.colors.primary }]}>{formatDuration(callDuration)}</Text>
             )}
          </View>
        )}

        {/* Local Video (Small Overlay) */}
        {isVideo && localStream && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              zOrder={1}
              mirror={true}
            />
          </View>
        )}

        {/* Controls Overlay */}
        <View style={styles.controlsContainer}>
          <View style={styles.topInfo}>
             <Text style={[styles.videoOverlayName, !isVideo && { color: theme.colors.textSecondary }]}>
                {isVideo ? (activeCall.type === 'video' ? 'Panggilan Vidio' : 'Panggilan Suara') : ''}
             </Text>
          </View>

          <View style={styles.bottomControls}>
            {showIncomingControls ? (
               // INCOMING CALL UI: Vertical/Split arrangement
               <View style={styles.incomingContainer}>
                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton, isEndState && { opacity: 0.5 }]} 
                      onPress={rejectCall}
                      disabled={isEndState}
                    >
                      <PhoneIcon size={30} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Tolak</Text>
                  </View>

                  <View style={styles.buttonWrapper}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.acceptButton, (isProcessing || isEndState) && { opacity: 0.5 }]} 
                      onPress={acceptCall}
                      disabled={isProcessing || isEndState}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        isVideo ? <VideoIcon size={30} color="#FFF" /> : <PhoneIcon size={30} color="#FFF" />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Terima</Text>
                  </View>
               </View>
            ) : (
               // OUTGOING / ACTIVE CALL UI: Multi-row clean layout
               <View style={styles.activeCallContainer}>
                  {isVideo && (
                    <View style={styles.mediaControlsRow}>
                      <View style={styles.controlItem}>
                        <TouchableOpacity style={styles.smallActionButton} onPress={switchCamera}>
                          <FlipIcon size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Kamera</Text>
                      </View>

                      <View style={styles.controlItem}>
                        <TouchableOpacity 
                          style={[styles.smallActionButton, !isVideoEnabled && styles.activeControl]} 
                          onPress={toggleVideo}
                        >
                          <VideoIcon size={22} color={!isVideoEnabled ? theme.colors.primary : "#FFF"} />
                        </TouchableOpacity>
                        <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Video</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.mainControlsRow}>
                    <View style={styles.controlItem}>
                      <TouchableOpacity 
                        style={styles.smallActionButton} 
                        onPress={toggleMute}
                      >
                        <MicOffIcon size={22} color={isMuted ? theme.colors.primary : theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                    </View>

                    <View style={styles.hangupWrapper}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.hangupButton, isEndState && { opacity: 0.5 }]} 
                        onPress={hangup}
                        disabled={isEndState}
                      >
                        <PhoneIcon size={32} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Selesai</Text>
                    </View>

                    <View style={styles.controlItem}>
                      <TouchableOpacity 
                        style={styles.smallActionButton} 
                        onPress={toggleLoudspeaker}
                      >
                        <SpeakerIcon size={22} color={isLoudspeaker ? theme.colors.primary : theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={[styles.controlLabel, { color: theme.colors.textSecondary }]}>Speaker</Text>
                    </View>
                  </View>
               </View>
            )}
          </View>
        </View>
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
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: height * 0.15,
  },
  avatarCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
      fontSize: 56,
      color: '#FFF',
      fontWeight: '700',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  callStatus: {
    fontSize: 16,
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  callDuration: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: Platform.OS === 'android' ? 80 : 60,
  },
  topInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  videoOverlayName: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '600',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
  },
  bottomControls: {
    paddingHorizontal: 20,
    width: '100%',
    paddingBottom: 20,
  },
  incomingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 60,
  },
  activeCallContainer: {
    alignItems: 'center',
  },
  mediaControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    flexWrap: 'wrap',
  },
  controlItem: {
    alignItems: 'center',
    marginHorizontal: 12,
    width: 64,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  smallActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeControl: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  acceptButton: {
    backgroundColor: '#2ECC71',
  },
  rejectButton: {
    backgroundColor: '#E74C3C',
    transform: [{ rotate: '135deg' }],
  },
  hangupButton: {
    backgroundColor: '#E74C3C',
    transform: [{ rotate: '135deg' }],
  },
  mainControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
  },
  hangupWrapper: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  }
});
