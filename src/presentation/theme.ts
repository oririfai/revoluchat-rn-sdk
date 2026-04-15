export interface RevoluchatTheme {
    colors: {
        primary: string;
        primaryText: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        bubbleUser: string;
        bubbleUserText: string;
        bubbleOther: string;
        bubbleOtherText: string;
        border: string;
        error: string;
        online: string;
        inputBackground: string;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    typography: {
        fontFamily?: string;
        fontSizeSm: number;
        fontSizeMd: number;
        fontSizeLg: number;
        fontWeightBold: "bold" | "normal" | "500" | "600" | "700" | "800" | "900";
    };
    roundness: number;
}

export const defaultTheme: RevoluchatTheme = {
    colors: {
        primary: '#007AFF',
        primaryText: '#FFFFFF',
        secondary: '#5856D6',
        background: '#FFFFFF',
        surface: '#F2F2F7',
        text: '#000000',
        textSecondary: '#8E8E93',
        bubbleUser: '#007AFF',
        bubbleUserText: '#FFFFFF',
        bubbleOther: '#E9E9EB',
        bubbleOtherText: '#000000',
        border: '#C6C6C8',
        error: '#FF3B30',
        online: '#4CD964',
        inputBackground: '#F2F2F7',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
    },
    typography: {
        fontSizeSm: 12,
        fontSizeMd: 14,
        fontSizeLg: 16,
        fontWeightBold: '600',
    },
    roundness: 12,
};
