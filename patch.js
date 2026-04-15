const fs = require('fs');
const file = 'src/data/datasources/ChatSocketClient.ts';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
    /callEvents\.forEach\(event => \{\s*roomChannel\.on\(event, \(payload\) => \{\s*const callbacks = this\.roomCallbacks\.get\(roomId\);\s*if \(callbacks && callbacks\.onCall\) callbacks\.onCall\(event, payload\);\s*\/\/ Notify global listeners with deduplication\s*this\.notifyGlobalCall\(event, payload\);\s*\}\);\s*\}\);/g,
`callEvents.forEach(event => {
                     roomChannel.on(event, (payload) => {
                        console.log(\`[Revoluchat SDK] roomChannel -> Global Call Event [\${event}]:\`, payload);
                        const callbacks = this.roomCallbacks.get(roomId);
                        if (callbacks && callbacks.onCall) callbacks.onCall(event, payload);

                        // CRITICAL REDUNDANCY:
                        // If the receiver is currently in the room, they might receive the call:incoming
                        // here first. The userChannel might drop or get delayed.
                        // We must immediately push this to the userChannelCallback to guarantee 
                        // ChatClient sets up the activeCall!
                        if (this.userChannelCallback) {
                            this.userChannelCallback({ type: 'call_event', event, payload });
                        }

                        // Notify global listeners with deduplication
                        this.notifyGlobalCall(event, payload);
                     });
                 });`
);

fs.writeFileSync(file, data);
console.log('patched');
