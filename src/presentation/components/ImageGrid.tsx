import React from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Attachment } from '../../domain/entities/Message';

interface ImageGridProps {
  images: Attachment[];
  onImagePress?: (image: Attachment) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_WIDTH = SCREEN_WIDTH * 0.75; // Adjust based on bubble max-width

export const ImageGrid: React.FC<ImageGridProps> = ({ images, onImagePress }) => {
  if (images.length === 0) return null;

  const renderImage = (image: Attachment, style: any) => (
    <TouchableOpacity 
        key={image.id} 
        activeOpacity={0.8}
        onPress={() => onImagePress?.(image)}
        style={style}
    >
      <Image 
        source={{ uri: image.url }} 
        style={styles.image} 
      />
    </TouchableOpacity>
  );

  if (images.length === 1) {
    return (
      <View style={styles.container}>
        {renderImage(images[0], styles.singleImage)}
      </View>
    );
  }

  if (images.length === 2) {
    return (
      <View style={[styles.container, styles.row]}>
        {renderImage(images[0], styles.halfImage)}
        <View style={styles.spacer} />
        {renderImage(images[1], styles.halfImage)}
      </View>
    );
  }

  if (images.length === 3) {
    return (
      <View style={styles.container}>
        {renderImage(images[0], styles.fullWidthImage)}
        <View style={[styles.row, { marginTop: 4 }]}>
          {renderImage(images[1], styles.halfImage)}
          <View style={styles.spacer} />
          {renderImage(images[2], styles.halfImage)}
        </View>
      </View>
    );
  }

  // 4 or more
  const displayImages = images.slice(0, 4);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {renderImage(displayImages[0], styles.halfImage)}
        <View style={styles.spacer} />
        {renderImage(displayImages[1], styles.halfImage)}
      </View>
      <View style={[styles.row, { marginTop: 4 }]}>
        {renderImage(displayImages[2], styles.halfImage)}
        <View style={styles.spacer} />
        {renderImage(displayImages[3], styles.halfImage)}
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
