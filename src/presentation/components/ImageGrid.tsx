import { View, Image, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing } from 'react-native';
import { Attachment } from '../../domain/entities/Message';
import { useState, useRef, useEffect } from 'react';

interface ImageGridProps {
  images: Attachment[];
  onImagePress?: (image: Attachment) => void;
  onLongPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_WIDTH = SCREEN_WIDTH * 0.75; 

/**
 * Modern Shimmer Effect Component
 */
const ShimmerEffect = () => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-GRID_WIDTH, GRID_WIDTH],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E1E1E2', overflow: 'hidden' }]}>
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            transform: [{ translateX }, { skewX: '-20deg' }],
          },
        ]}
      />
    </View>
  );
};

const ImageItem: React.FC<{
  image: Attachment;
  style: any;
  onPress?: () => void;
  onLongPress?: () => void;
}> = ({ image, style, onPress, onLongPress }) => {
  const [loaded, setLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLoad = () => {
    setLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[style, { overflow: 'hidden' }]}
    >
      {!loaded && <ShimmerEffect />}
      <Animated.Image 
        source={{ uri: image.url }} 
        style={[styles.image, { opacity: fadeAnim }]}
        onLoad={handleLoad}
      />
    </TouchableOpacity>
  );
};

export const ImageGrid: React.FC<ImageGridProps> = ({ images, onImagePress, onLongPress }) => {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <View style={styles.container}>
        <ImageItem 
          image={images[0]} 
          style={styles.singleImage} 
          onPress={() => onImagePress?.(images[0])}
          onLongPress={onLongPress}
        />
      </View>
    );
  }

  if (images.length === 2) {
    return (
      <View style={[styles.container, styles.row]}>
        <ImageItem 
          image={images[0]} 
          style={styles.halfImage} 
          onPress={() => onImagePress?.(images[0])}
          onLongPress={onLongPress}
        />
        <View style={styles.spacer} />
        <ImageItem 
          image={images[1]} 
          style={styles.halfImage} 
          onPress={() => onImagePress?.(images[1])}
          onLongPress={onLongPress}
        />
      </View>
    );
  }

  if (images.length === 3) {
    return (
      <View style={styles.container}>
        <ImageItem 
          image={images[0]} 
          style={styles.fullWidthImage} 
          onPress={() => onImagePress?.(images[0])}
          onLongPress={onLongPress}
        />
        <View style={[styles.row, { marginTop: 4 }]}>
          <ImageItem 
            image={images[1]} 
            style={styles.halfImage} 
            onPress={() => onImagePress?.(images[1])}
            onLongPress={onLongPress}
          />
          <View style={styles.spacer} />
          <ImageItem 
            image={images[2]} 
            style={styles.halfImage} 
            onPress={() => onImagePress?.(images[2])}
            onLongPress={onLongPress}
          />
        </View>
      </View>
    );
  }

  // 4 or more
  const displayImages = images.slice(0, 4);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ImageItem 
          image={displayImages[0]} 
          style={styles.halfImage} 
          onPress={() => onImagePress?.(displayImages[0])}
          onLongPress={onLongPress}
        />
        <View style={styles.spacer} />
        <ImageItem 
          image={displayImages[1]} 
          style={styles.halfImage} 
          onPress={() => onImagePress?.(displayImages[1])}
          onLongPress={onLongPress}
        />
      </View>
      <View style={[styles.row, { marginTop: 4 }]}>
        <ImageItem 
          image={displayImages[2]} 
          style={styles.halfImage} 
          onPress={() => onImagePress?.(displayImages[2])}
          onLongPress={onLongPress}
        />
        <View style={styles.spacer} />
        <ImageItem 
          image={displayImages[3]} 
          style={styles.halfImage} 
          onPress={() => onImagePress?.(displayImages[3])}
          onLongPress={onLongPress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: GRID_WIDTH,
    overflow: 'hidden',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  singleImage: {
    width: '100%',
    height: GRID_WIDTH,
  },
  halfImage: {
    flex: 1,
    height: GRID_WIDTH / 2,
  },
  fullWidthImage: {
    width: '100%',
    height: GRID_WIDTH / 2,
  },
  spacer: {
    width: 4,
  },
});
