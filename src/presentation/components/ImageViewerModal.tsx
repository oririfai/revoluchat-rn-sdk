import React from 'react';
import { 
    Modal, 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    SafeAreaView,
    Dimensions,
    Animated,
    PanResponder,
    GestureResponderEvent,
    PanResponderGestureState
} from 'react-native';
import { Attachment, Message } from '../../domain/entities/Message';
import { useRevoluchat } from '../RevoluchatProvider';
import { BackIcon, ForwardMessageIcon, MenuDotsVerticalIcon, SmileIcon, ReplyIcon } from './Icons';

interface ImageViewerModalProps {
    visible: boolean;
    onClose: () => void;
    message: Message | null;
    attachment: Attachment | null;
    onReply?: (message: Message) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Pure JS Pinch-to-Zoom implementation using PanResponder.
 * Bypasses Android's lack of ScrollView zoom support without adding 3rd party libs.
 */
const ZoomableImage = ({ uri }: { uri: string }) => {
    const scale = React.useRef(new Animated.Value(1)).current;
    const translateX = React.useRef(new Animated.Value(0)).current;
    const translateY = React.useRef(new Animated.Value(0)).current;

    const baseScale = React.useRef(1);
    const pinchDistance = React.useRef(1);
    const lastPan = React.useRef({ x: 0, y: 0 });
    const fingers = React.useRef(0);

    const calcDistance = (touches: any) => {
        if (touches.length < 2) return 1;
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,

            onPanResponderGrant: (evt: GestureResponderEvent) => {
                const touches = evt.nativeEvent.touches;
                fingers.current = touches.length;

                if (touches.length >= 2) {
                    pinchDistance.current = calcDistance(touches);
                    baseScale.current = (scale as any)._value || 1;
                } else if (touches.length === 1) {
                    lastPan.current = {
                        x: (translateX as any)._value || 0,
                        y: (translateY as any)._value || 0,
                    };
                }
            },

            onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                const touches = evt.nativeEvent.touches;
                
                if (touches.length >= 2) {
                    if (fingers.current < 2) {
                        // Just transitioned to 2 fingers
                        pinchDistance.current = calcDistance(touches);
                        baseScale.current = (scale as any)._value || 1;
                        fingers.current = touches.length;
                        return; // skip first noisy frame
                    }

                    const currentDistance = calcDistance(touches);
                    const zoomFactor = currentDistance / pinchDistance.current;
                    let newScale = baseScale.current * zoomFactor;
                    
                    if (newScale < 0.8) newScale = 0.8; // Allow slightly smaller so they know they are pulling
                    if (newScale > 5) newScale = 5;
                    
                    scale.setValue(newScale);
                } else if (touches.length === 1 && baseScale.current > 1) {
                    if (fingers.current !== 1) {
                        // Just transitioned to 1 finger
                        // Store the current exact position to prevent jumping
                        lastPan.current = {
                            x: (translateX as any)._value || 0,
                            y: (translateY as any)._value || 0,
                        };
                        fingers.current = 1;

                        // We can't rely on gestureState.dx here because it accumulates from earlier touches.
                        // So we wait until the next frame.
                        return;
                    }
                    
                    // Simple panning
                    translateX.setValue(lastPan.current.x + gestureState.dx);
                    translateY.setValue(lastPan.current.y + gestureState.dy);
                }
            },

            onPanResponderRelease: () => {
                fingers.current = 0;
                const currentScale = (scale as any)._value || 1;
                if (currentScale <= 1) {
                    Animated.parallel([
                        Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
                        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: false }),
                    ]).start();
                    baseScale.current = 1;
                } else {
                    baseScale.current = currentScale;
                }
            },
            onPanResponderTerminate: () => {
                fingers.current = 0;
                const currentScale = (scale as any)._value || 1;
                if (currentScale <= 1) {
                    Animated.parallel([
                        Animated.spring(scale, { toValue: 1, useNativeDriver: false }),
                        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }),
                        Animated.spring(translateY, { toValue: 0, useNativeDriver: false }),
                    ]).start();
                    baseScale.current = 1;
                } else {
                    baseScale.current = currentScale;
                }
            }
        })
    ).current;

    return (
        <View style={styles.imageScrollContainer} {...panResponder.panHandlers}>
            <Animated.Image
                source={{ uri }}
                style={[
                    styles.image,
                    {
                        transform: [
                            { translateX: translateX },
                            { translateY: translateY },
                            { scale: scale },
                        ],
                    },
                ]}
                resizeMode="contain"
            />
        </View>
    );
};

/**
 * Full Screen Image Viewer Modal
 */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ 
    visible, 
    onClose, 
    message, 
    attachment,
    onReply
}) => {
    const { theme } = useRevoluchat();

    if (!visible || !attachment) return null;

    const formatTime = (date: Date) => {
        if (!date) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `Hari ini ${pad(date.getHours())}.${pad(date.getMinutes())}`;
    };

    const senderName = message?.sender.name || 'Anda';
    const messageTime = message?.createdAt ? formatTime(new Date(message.createdAt)) : '';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <SafeAreaView style={styles.headerSafeArea} pointerEvents="box-none">
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                <BackIcon size={24} color="#FFF" />
                            </TouchableOpacity>
                            <View style={styles.headerTitleContainer}>
                                <Text style={styles.headerTitle}>{senderName}</Text>
                                {messageTime ? <Text style={styles.headerSubtitle}>{messageTime}</Text> : null}
                            </View>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.iconButton}>
                                <ForwardMessageIcon size={24} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton}>
                                <MenuDotsVerticalIcon size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>

                {/* Pure JS Zoomable Image Area */}
                <ZoomableImage uri={attachment.url} />

                {/* Bottom Overlays */}
                <SafeAreaView style={styles.footerSafeArea}>
                    <View style={styles.bottomOverlayContainer}>
                        
                        {message?.text ? (
                            <View style={styles.captionContainer}>
                                <Text style={styles.captionText}>{message.text}</Text>
                            </View>
                        ) : null}

                        <View style={styles.footerActions}>
                            <TouchableOpacity style={styles.emojiButton}>
                                <SmileIcon size={22} color="#FFF" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.replyButton}
                                onPress={() => {
                                    if (onReply && message) {
                                        onReply(message);
                                        onClose();
                                    }
                                }}
                            >
                                <ReplyIcon size={20} color="#FFF" />
                                <Text style={styles.replyText}>Balas</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111111',
    },
    headerSafeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(17, 17, 17, 0.4)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        marginLeft: 8,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageScrollContainer: {
        flex: 1,
    },
    imageScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    footerSafeArea: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(17, 17, 17, 0.4)',
    },
    bottomOverlayContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    captionContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    captionText: {
        color: '#FFFFFF',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    emojiButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
    },
    replyText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 8,
    }
});
