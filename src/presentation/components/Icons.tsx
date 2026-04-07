import React from 'react';
import { View, StyleSheet, ColorValue } from 'react-native';
import Svg, { Path, G, Rect, ClipPath, Defs } from 'react-native-svg';

/**
 * Common Icon Props
 */
interface IconProps {
  size?: number;
  color?: ColorValue;
}

/**
 * Base Container for Icons to ensure consistent sizing
 */
const IconContainer: React.FC<{ size: number; children: React.ReactNode }> = ({ size, children }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    {children}
  </View>
);

export const PhoneIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M2 3C2 2.44772 2.44772 2 3 2H5.15287C5.64171 2 6.0589 2.35341 6.13927 2.8356L6.87858 7.27147C6.95075 7.70451 6.73206 8.13397 6.3394 8.3303L4.79126 9.10437C5.90756 11.8783 8.12168 14.0924 10.8956 15.2087L11.6697 13.6606C11.866 13.2679 12.2955 13.0492 12.7285 13.1214L17.1644 13.8607C17.6466 13.9411 18 14.3583 18 14.8471V17C18 17.5523 17.5523 18 17 18H15C7.8203 18 2 12.1797 2 5V3Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const VideoIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M2 6C2 4.89543 2.89543 4 4 4H10C11.1046 4 12 4.89543 12 6V14C12 15.1046 11.1046 16 10 16H4C2.89543 16 2 15.1046 2 14V6Z" fill={color as string}/>
      <Path d="M14.5528 7.10557C14.214 7.27497 14 7.62123 14 8V12C14 12.3788 14.214 12.725 14.5528 12.8944L16.5528 13.8944C16.8628 14.0494 17.2309 14.0329 17.5257 13.8507C17.8205 13.6684 18 13.3466 18 13V7C18 6.65342 17.8205 6.33156 17.5257 6.14935C17.2309 5.96714 16.8628 5.95058 16.5528 6.10557L14.5528 7.10557Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

/**
 * Flip Camera Icon
 */
export const FlipIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => {
  const scale = size / 24;
  return (
    <IconContainer size={size}>
      <View style={{
        width: 16 * scale,
        height: 16 * scale,
        borderRadius: 8 * scale,
        borderWidth: 2 * scale,
        borderColor: color,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          width: 8 * scale,
          height: 2 * scale,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }]
        }} />
      </View>
    </IconContainer>
  );
};

export const MicOffIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M9.38268 3.07615C9.75636 3.23093 10 3.59557 10 4.00003V16C10 16.4045 9.75636 16.7691 9.38268 16.9239C9.00901 17.0787 8.57889 16.9931 8.29289 16.7071L4.58579 13H2C1.44772 13 1 12.5523 1 12V8.00003C1 7.44774 1.44772 7.00003 2 7.00003H4.58579L8.29289 3.29292C8.57889 3.00692 9.00901 2.92137 9.38268 3.07615Z" fill={color as string}/>
      <Path fillRule="evenodd" clipRule="evenodd" d="M12.2929 7.29289C12.6834 6.90237 13.3166 6.90237 13.7071 7.29289L15 8.58579L16.2929 7.29289C16.6834 6.90237 17.3166 6.90237 17.7071 7.29289C18.0976 7.68342 18.0976 8.31658 17.7071 8.70711L16.4142 10L17.7071 11.2929C18.0976 11.6834 18.0976 12.3166 17.7071 12.7071C17.3166 13.0976 16.6834 13.0976 16.2929 12.7071L15 11.4142L13.7071 12.7071C13.3166 13.0976 12.6834 13.0976 12.2929 12.7071C11.9024 12.3166 11.9024 11.6834 12.2929 11.2929L13.5858 10L12.2929 8.70711C11.9024 8.31658 11.9024 7.68342 12.2929 7.29289Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const SpeakerIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M9.38268 3.07615C9.75636 3.23093 10 3.59557 10 4.00003V16C10 16.4045 9.75636 16.7691 9.38268 16.9239C9.00901 17.0787 8.57889 16.9931 8.29289 16.7071L4.58579 13H2C1.44772 13 1 12.5523 1 12V8.00003C1 7.44774 1.44772 7.00003 2 7.00003H4.58579L8.29289 3.29292C8.57889 3.00692 9.00901 2.92137 9.38268 3.07615Z" fill={color as string}/>
      <Path fillRule="evenodd" clipRule="evenodd" d="M14.6568 2.92888C15.0474 2.53836 15.6805 2.53836 16.0711 2.92888C17.8796 4.73743 19 7.2388 19 9.99995C19 12.7611 17.8796 15.2625 16.0711 17.071C15.6805 17.4615 15.0474 17.4615 14.6568 17.071C14.2663 16.6805 14.2663 16.0473 14.6568 15.6568C16.1057 14.208 17 12.2094 17 9.99995C17 7.79053 16.1057 5.7919 14.6568 4.34309C14.2663 3.95257 14.2663 3.3194 14.6568 2.92888ZM11.8284 5.75731C12.2189 5.36678 12.8521 5.36678 13.2426 5.75731C13.7685 6.28319 14.1976 6.90687 14.5003 7.59958C14.822 8.33592 15 9.14847 15 9.99995C15 11.6565 14.3273 13.1579 13.2426 14.2426C12.8521 14.6331 12.2189 14.6331 11.8284 14.2426C11.4379 13.8521 11.4379 13.2189 11.8284 12.8284C12.5534 12.1034 13 11.1048 13 9.99995C13 9.42922 12.8811 8.8889 12.6676 8.40032C12.4663 7.93958 12.1802 7.52327 11.8284 7.17152C11.4379 6.781 11.4379 6.14783 11.8284 5.75731Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const IncomingIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M14.4142 7L17.7071 3.70711C18.0976 3.31658 18.0976 2.68342 17.7071 2.29289C17.3166 1.90237 16.6834 1.90237 16.2929 2.29289L13 5.58579V4C13 3.44772 12.5523 3 12 3C11.4477 3 11 3.44772 11 4V7.99931C11 8.00031 11 8.002 11 8.003C11.0004 8.1375 11.0273 8.26575 11.0759 8.38278C11.1236 8.49805 11.1937 8.6062 11.2864 8.70055C11.2907 8.70494 11.2951 8.70929 11.2995 8.7136C11.3938 8.80626 11.502 8.87643 11.6172 8.92412C11.7351 8.97301 11.8644 9 12 9H16C16.5523 9 17 8.55228 17 8C17 7.44772 16.5523 7 16 7H14.4142Z" fill={color as string}/>
      <Path d="M2 3C2 2.44772 2.44772 2 3 2H5.15287C5.64171 2 6.0589 2.35341 6.13927 2.8356L6.87858 7.27147C6.95075 7.70451 6.73206 8.13397 6.3394 8.3303L4.79126 9.10437C5.90756 11.8783 8.12168 14.0924 10.8956 15.2087L11.6697 13.6606C11.866 13.2679 12.2955 13.0492 12.7285 13.1214L17.1644 13.8607C17.6466 13.9411 18 14.3583 18 14.8471V17C18 17.5523 17.5523 18 17 18H15C7.8203 18 2 12.1797 2 5V3Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const OutgoingIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M17.9241 2.61722C17.8757 2.50014 17.804 2.3904 17.7092 2.29502C17.7078 2.2936 17.7064 2.29219 17.705 2.29078C17.5242 2.11106 17.2751 2 17 2H13C12.4477 2 12 2.44772 12 3C12 3.55228 12.4477 4 13 4H14.5858L11.2929 7.29289C10.9024 7.68342 10.9024 8.31658 11.2929 8.70711C11.6834 9.09763 12.3166 9.09763 12.7071 8.70711L16 5.41421V7C16 7.55228 16.4477 8 17 8C17.5523 8 18 7.55228 18 7V3C18 2.86441 17.973 2.73512 17.9241 2.61722Z" fill={color as string}/>
      <Path d="M2 3C2 2.44772 2.44772 2 3 2H5.15287C5.64171 2 6.0589 2.35341 6.13927 2.8356L6.87858 7.27147C6.95075 7.70451 6.73206 8.13397 6.3394 8.3303L4.79126 9.10437C5.90756 11.8783 8.12168 14.0924 10.8956 15.2087L11.6697 13.6606C11.866 13.2679 12.2955 13.0492 12.7285 13.1214L17.1644 13.8607C17.6466 13.9411 18 14.3583 18 14.8471V17C18 17.5523 17.5523 18 17 18H15C7.8203 18 2 12.1797 2 5V3Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

/**
 * Back Icon
 */
export const BackIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => {
  const scale = size / 24;
  return (
    <IconContainer size={size}>
      <View style={{
        width: 12 * scale,
        height: 12 * scale,
        borderLeftWidth: 2 * scale,
        borderBottomWidth: 2 * scale,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginLeft: 4 * scale,
      }} />
    </IconContainer>
  );
};

export const ImageIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M4 5C2.89543 5 2 5.89543 2 7V15C2 16.1046 2.89543 17 4 17H16C17.1046 17 18 16.1046 18 15V7C18 5.89543 17.1046 5 16 5H14.4142C14.149 5 13.8946 4.89464 13.7071 4.70711L12.5858 3.58579C12.2107 3.21071 11.702 3 11.1716 3H8.82843C8.29799 3 7.78929 3.21071 7.41421 3.58579L6.29289 4.70711C6.10536 4.89464 5.851 5 5.58579 5H4ZM10 14C11.6569 14 13 12.6569 13 11C13 9.34315 11.6569 8 10 8C8.34315 8 7 9.34315 7 11C7 12.6569 8.34315 14 10 14Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const AttachIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M8 4C6.34315 4 5 5.34315 5 7V11C5 13.7614 7.23858 16 10 16C12.7614 16 15 13.7614 15 11V7C15 6.44772 15.4477 6 16 6C16.5523 6 17 6.44772 17 7V11C17 14.866 13.866 18 10 18C6.13401 18 3 14.866 3 11V7C3 4.23858 5.23858 2 8 2C10.7614 2 13 4.23858 13 7V11C13 12.6569 11.6569 14 10 14C8.34315 14 7 12.6569 7 11V7C7 6.44772 7.44772 6 8 6C8.55228 6 9 6.44772 9 7V11C9 11.5523 9.44772 12 10 12C10.5523 12 11 11.5523 11 11V7C11 5.34315 9.65685 4 8 4Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const SendIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <G clipPath="url(#clip0_6011_1100)">
        <Path d="M18.2122 3.6802C18.3319 3.32086 18.2384 2.92469 17.9706 2.65686C17.7027 2.38903 17.3066 2.29551 16.9472 2.41529L2.09801 7.36503C1.72179 7.49044 1.45522 7.82631 1.41852 8.22117C1.38183 8.61604 1.58193 8.99528 1.92859 9.18787L6.47427 11.7132C6.86456 11.9301 7.35131 11.8619 7.66702 11.5462L10.8995 8.31371C11.29 7.92318 11.9232 7.92318 12.3137 8.31371C12.7042 8.70423 12.7042 9.3374 12.3137 9.72792L9.08123 12.9604C8.76552 13.2761 8.69735 13.7629 8.91418 14.1532L11.4396 18.6989C11.6322 19.0455 12.0114 19.2456 12.4063 19.2089C12.8011 19.1722 13.137 18.9057 13.2624 18.5294L18.2122 3.6802Z" fill={color as string}/>
      </G>
      <Defs>
        <ClipPath id="clip0_6011_1100">
          <Rect width="20" height="20" fill="white"/>
        </ClipPath>
      </Defs>
    </Svg>
  </IconContainer>
);

/**
 * Audio / Music Note Icon
 */
export const AudioIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => {
  const scale = size / 24;
  return (
    <IconContainer size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ width: 6 * scale, height: 6 * scale, borderRadius: 3 * scale, backgroundColor: color }} />
        <View style={{ width: 2 * scale, height: 12 * scale, backgroundColor: color, marginLeft: -1 * scale }} />
        <View style={{ width: 6 * scale, height: 2 * scale, backgroundColor: color, marginTop: -12 * scale, marginLeft: 0 }} />
      </View>
    </IconContainer>
  );
};

/**
 * File Icon
 */
export const FileIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => {
  const scale = size / 24;
  return (
    <IconContainer size={size}>
      <View style={{
        width: 14 * scale,
        height: 18 * scale,
        borderWidth: 2 * scale,
        borderColor: color,
        borderRadius: 2 * scale,
      }}>
        <View style={{
          width: 6 * scale,
          height: 6 * scale,
          borderLeftWidth: 2 * scale,
          borderBottomWidth: 2 * scale,
          borderColor: color,
          position: 'absolute',
          top: -2 * scale,
          right: -2 * scale,
          backgroundColor: '#FFF',
        }} />
      </View>
    </IconContainer>
  );
};

/**
 * Mic Icon / Unmute Icon
 */
export const MicIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M14.6568 2.92888C15.0474 2.53836 15.6805 2.53836 16.0711 2.92888C17.8796 4.73743 19 7.2388 19 9.99995C19 12.7611 17.8796 15.2625 16.0711 17.071C15.6805 17.4615 15.0474 17.4615 14.6568 17.071C14.2663 16.6805 14.2663 16.0473 14.6568 15.6568C16.1057 14.208 17 12.2094 17 9.99995C17 7.79053 16.1057 5.7919 14.6568 4.34309C14.2663 3.95257 14.2663 3.3194 14.6568 2.92888ZM11.8284 5.75731C12.2189 5.36678 12.8521 5.36678 13.2426 5.75731C13.7685 6.28319 14.1976 6.90687 14.5003 7.59958C14.822 8.33592 15 9.14847 15 9.99995C15 11.6565 14.3273 13.1579 13.2426 14.2426C12.8521 14.6331 12.2189 14.6331 11.8284 14.2426C11.4379 13.8521 11.4379 13.2189 11.8284 12.8284C12.5534 12.1034 13 11.1048 13 9.99995C13 9.42922 12.8811 8.8889 12.6676 8.40032C12.4663 7.93958 12.1802 7.52327 11.8284 7.17152C11.4379 6.781 11.4379 6.14783 11.8284 5.75731Z" fill={color}/>
    </Svg>
  </IconContainer>
);

export const MissedCallIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M2 3C2 2.44772 2.44772 2 3 2H5.15287C5.64171 2 6.0589 2.35341 6.13927 2.8356L6.87858 7.27147C6.95075 7.70451 6.73206 8.13397 6.3394 8.3303L4.79126 9.10437C5.90756 11.8783 8.12168 14.0924 10.8956 15.2087L11.6697 13.6606C11.866 13.2679 12.2955 13.0492 12.7285 13.1214L17.1644 13.8607C17.6466 13.9411 18 14.3583 18 14.8471V17C18 17.5523 17.5523 18 17 18H15C7.8203 18 2 12.1797 2 5V3Z" fill={color as string}/>
      <Path d="M16.7071 3.29289C17.0976 3.68342 17.0976 4.31658 16.7071 4.70711L15.4142 6L16.7071 7.29289C17.0976 7.68342 17.0976 8.31658 16.7071 8.70711C16.3166 9.09763 15.6834 9.09763 15.2929 8.70711L14 7.41421L12.7071 8.70711C12.3166 9.09763 11.6834 9.09763 11.2929 8.70711C10.9024 8.31658 10.9024 7.68342 11.2929 7.29289L12.5858 6L11.2929 4.70711C10.9024 4.31658 10.9024 3.68342 11.2929 3.29289C11.6834 2.90237 12.3166 2.90237 12.7071 3.29289L14 4.58579L15.2929 3.29289C15.6834 2.90237 16.3166 2.90237 16.7071 3.29289Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

export const ReplyIcon: React.FC<IconProps> = ({ size = 24, color = '#333' }) => (
  <IconContainer size={size}>
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M7.70711 3.29289C8.09763 3.68342 8.09763 4.31658 7.70711 4.70711L5.41421 7H11C14.866 7 18 10.134 18 14V16C18 16.5523 17.5523 17 17 17C16.4477 17 16 16.5523 16 16V14C16 11.2386 13.7614 9 11 9H5.41421L7.70711 11.2929C8.09763 11.6834 8.09763 12.3166 7.70711 12.7071C7.31658 13.0976 6.68342 13.0976 6.29289 12.7071L2.29289 8.70711C1.90237 8.31658 1.90237 7.68342 2.29289 7.29289L6.29289 3.29289C6.68342 2.90237 7.31658 2.90237 7.70711 3.29289Z" fill={color as string}/>
    </Svg>
  </IconContainer>
);

const styles = StyleSheet.create({});
