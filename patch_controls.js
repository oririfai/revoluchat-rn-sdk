const fs = require('fs');
const file = 'src/presentation/hooks/useCallControls.ts';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
    /\/\/ Start Custom Dial Tone for Caller using Native Module\s*NativeAudioRoute\.startRingback\('incallmanager_ringback'\);\s*\/\/ Setup RTC and add stream — offer sent when call:accepted arrives\s*await setupRTC\(newCall\);\s*rtcRef\.current\?\.addStream\(stream\);/g,
    `// Setup RTC and add stream — offer sent when call:accepted arrives
            await setupRTC(newCall);
            rtcRef.current?.addStream(stream);
            
            // WebRTC RTCPeerConnection completely intercepts the Android audio focus
            // Wait a split second to let WebRTC finish C++ AudioDevice initialization, 
            // then force our ringback audio into the stream!
            setTimeout(() => {
                NativeAudioRoute.startRingback('incallmanager_ringback');
            }, 1000);`
);

fs.writeFileSync(file, data);
console.log('patched');
