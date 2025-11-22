
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from "@google/genai";
import { Card, CardHeader } from './Card';
import { LiveIcon } from './icons/LiveIcon';
import { CameraIcon } from './icons/CameraIcon';
import { CameraOffIcon } from './icons/CameraOffIcon';
import { SwitchCameraIcon } from './icons/SwitchCameraIcon';

const API_KEY = process.env.API_KEY as string;

// --- Audio Helpers ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] to prevent overflow wrapping
    const clamped = Math.max(-1, Math.min(1, data[i]));
    // Scale to Int16 range. Use 32767 to avoid hitting -32768 edge cases
    int16[i] = clamped * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const LiveAssistant: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [status, setStatus] = useState<string>("Ready to connect");
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const stopEverything = useCallback(() => {
    if (sessionRef.current) {
      // We can't really cancel the promise, but we nullify the ref
      sessionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all playing audio sources
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    setConnected(false);
    setIsCameraActive(false);
    setStatus("Disconnected");
  }, []);

  // Re-attach stream when camera becomes active and video element is rendered
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [isCameraActive]);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newStatus = !videoTracks[0].enabled;
        videoTracks.forEach(track => track.enabled = newStatus);
        setIsCameraActive(newStatus);
      }
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (!streamRef.current) return;
    
    const currentMode = facingMode;
    const targetMode = currentMode === 'user' ? 'environment' : 'user';
    
    try {
        let newStream: MediaStream;
        try {
            // Try to force the specific camera mode (important for back camera on mobile)
            newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: targetMode } }
            });
        } catch (e) {
            // Fallback (e.g., desktops often don't support 'environment' or 'exact' constraints)
            console.log("Exact facing mode failed, falling back to ideal", e);
            newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: targetMode }
            });
        }

        const newVideoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];

        // Replace track
        if (oldVideoTrack) {
            oldVideoTrack.stop();
            streamRef.current.removeTrack(oldVideoTrack);
        }
        
        streamRef.current.addTrack(newVideoTrack);
        
        // Update state
        setFacingMode(targetMode);
        setIsCameraActive(true); // Switching implies activating camera
        
        // Update video element
        if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            try {
               await videoRef.current.play();
            } catch(e) {
                console.error("Error playing video after switch:", e);
            }
        }
    } catch (err) {
        console.error("Error switching camera:", err);
        setError("Could not switch camera. Ensure your device has multiple cameras.");
    }
  }, [facingMode]);

  const connect = async () => {
    setError(null);
    setStatus("Connecting...");

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      // Initialize audio contexts
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (inputAudioContext.state === 'suspended') {
        await inputAudioContext.resume();
      }
      if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
      }

      inputAudioContextRef.current = inputAudioContext;
      audioContextRef.current = outputAudioContext;
      nextStartTimeRef.current = 0;

      // Get User Media with current facing mode preference
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { facingMode: facingMode } 
      });
      streamRef.current = stream;
      
      // Enable camera by default
      setIsCameraActive(true);

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "You are Architex AI, an intelligent architectural design assistant. You are currently in a live video and audio session with a user. You can see what they show you via their camera and hear them. Provide helpful, professional advice on architectural design, materials, layouts, and aesthetics. Be concise but informative.",
        },
        callbacks: {
          onopen: () => {
            setStatus("Live");
            setConnected(true);
            
            // Audio Input Processing
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (!sessionRef.current) return;

                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                
                sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                }).catch(err => {
                    // Ignore errors if we are shutting down or network blips
                    console.debug("Send audio error:", err);
                });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            // Video Frame Processing
            const canvasEl = canvasRef.current;
            
            frameIntervalRef.current = window.setInterval(() => {
                if (document.hidden || !sessionRef.current) return;
                
                // Check if camera is active/enabled
                const videoTrack = streamRef.current?.getVideoTracks()[0];
                if (!videoTrack || !videoTrack.enabled) return;

                const videoEl = videoRef.current;
                if (!canvasEl || !videoEl || !videoEl.videoWidth) return;
                
                const ctx = canvasEl.getContext('2d');
                if (!ctx) return;

                canvasEl.width = videoEl.videoWidth * 0.25; // Scale down for performance
                canvasEl.height = videoEl.videoHeight * 0.25;
                ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
                
                canvasEl.toBlob(
                    async (blob) => {
                        if (blob) {
                            const base64Data = await blobToBase64(blob);
                            if (sessionRef.current) {
                                sessionPromise.then((session) => {
                                    session.sendRealtimeInput({
                                        media: { data: base64Data, mimeType: 'image/jpeg' }
                                    });
                                }).catch(err => {
                                    console.debug("Send video error:", err);
                                });
                            }
                        }
                    },
                    'image/jpeg',
                    0.6 // Quality
                );
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
             const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64EncodedAudioString) {
                 const audioCtx = audioContextRef.current;
                 if (!audioCtx) return;

                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
                 
                 const audioBuffer = await decodeAudioData(
                     decode(base64EncodedAudioString),
                     audioCtx,
                     24000,
                     1
                 );
                 
                 const source = audioCtx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(audioCtx.destination);
                 
                 source.addEventListener('ended', () => {
                     sourcesRef.current.delete(source);
                 });
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);
             }
             
             const interrupted = message.serverContent?.interrupted;
             if (interrupted) {
                 sourcesRef.current.forEach(source => source.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
          },
          onclose: () => {
            setStatus("Disconnected");
            setConnected(false);
          },
          onerror: (e) => {
             console.error("Live API Error", e);
             setError("Connection error occurred. Please check your network.");
             stopEverything();
          }
        }
      });
      
      sessionRef.current = sessionPromise;
      
      // Catch initial connection errors that might happen before onopen
      sessionPromise.catch((err) => {
          console.error("Connection failed", err);
          setError("Failed to connect to Gemini Live API.");
          stopEverything();
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStatus("Error");
      stopEverything();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
        stopEverything();
    };
  }, [stopEverything]);

  return (
    <Card>
      <CardHeader 
        title="Live Design Assistant"
        description="Connect with Gemini in real-time. Show your sketches or environment and ask for instant feedback."
        icon={<LiveIcon />}
      />

      <div className="flex flex-col items-center space-y-6">
        {/* Video Preview Area */}
        <div className="relative w-full max-w-2xl aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-700">
            {isCameraActive ? (
                <video 
                    ref={videoRef} 
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    autoPlay 
                    playsInline 
                    muted 
                />
            ) : (
                <div className="text-slate-500 flex flex-col items-center">
                    <LiveIcon />
                    <span className="mt-2">Camera Off</span>
                </div>
            )}
            
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                status === "Live" ? "bg-red-500 text-white animate-pulse" : 
                status === "Connecting..." ? "bg-yellow-500 text-white" : 
                "bg-slate-700 text-slate-300"
            }`}>
                {status}
            </div>
        </div>

        {/* Hidden Canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex items-center gap-4">
            {connected && (
                <>
                    <button
                        onClick={toggleCamera}
                        className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center ${
                            isCameraActive 
                            ? "bg-slate-200 text-slate-900 hover:bg-slate-300" 
                            : "bg-slate-700 text-white hover:bg-slate-600"
                        }`}
                        title={isCameraActive ? "Turn Camera Off" : "Turn Camera On"}
                    >
                        {isCameraActive ? <CameraIcon /> : <CameraOffIcon />}
                    </button>
                    <button
                        onClick={switchCamera}
                        className="p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center bg-slate-200 text-slate-900 hover:bg-slate-300"
                        title={facingMode === 'user' ? "Switch to Back Camera" : "Switch to Front Camera"}
                    >
                        <SwitchCameraIcon />
                    </button>
                </>
            )}
            
            {!connected ? (
                <button 
                    onClick={connect}
                    className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-full font-bold text-lg hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                    <LiveIcon />
                    <span>Start Live Session</span>
                </button>
            ) : (
                <button 
                    onClick={stopEverything}
                    className="flex items-center gap-2 px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                    <span>End Session</span>
                </button>
            )}
        </div>

        {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg text-sm">
                {error}
            </div>
        )}

        <div className="text-center max-w-lg text-sm text-slate-500 dark:text-slate-400">
            <p>Ensure you have allowed camera and microphone access. The AI will see what you show it and respond with voice.</p>
        </div>
      </div>
    </Card>
  );
};

export default LiveAssistant;
