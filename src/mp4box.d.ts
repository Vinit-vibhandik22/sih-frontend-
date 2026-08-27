declare module 'mp4box' {
  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number;
  }

  export interface TrackDescription {
    avcC?: Uint8Array;
    hvcC?: Uint8Array;
    vpcC?: Uint8Array;
    av1C?: Uint8Array;
    config?: unknown;
  }

  export interface VideoTrack {
    id: number;
    codec: string;
    type: 'video' | 'audio' | string;
    video: {
      width: number;
      height: number;
    };
    description?: TrackDescription;
  }

  export interface AudioTrack {
    id: number;
    codec: string;
    type: 'audio' | string;
    audio: {
      sample_rate: number;
      channel_count: number;
    };
  }

  export interface MP4FileInfo {
    videoTracks: VideoTrack[];
    audioTracks: AudioTrack[];
    duration: number;
    timescale: number;
    isFragmented: boolean;
    fragment_duration: number;
    isProgressive: boolean;
    hasIOD: boolean;
    brands: string[];
    created: Date;
    modified: Date;
  }

  export interface MP4Sample {
    data: ArrayBuffer;
    cts: number; // composition time stamp
    dts: number; // decode time stamp
    duration: number;
    is_rap: boolean; // random access point
    is_sync: number; // synonym for is_rap
    is_key: number; // 1 if key frame
    number: number;
    size: number;
    timescale: number;
  }

  export interface MP4File {
    onReady?: (info: MP4FileInfo) => void;
    onSamples?: (id: number, user: unknown, samples: MP4Sample[]) => void;
    onError?: (e: Error) => void;

    setExtractionOptions(trackId: number, options?: unknown | null, config?: { nbSamples?: number }): void;
    start(): void;
    stop(): void;
    flush(): void;
    appendBuffer(buffer: MP4ArrayBuffer): void;

    releaseUsedSamples(trackId: number, sampleNumber: number): void;

    // Internal property exposed on instance
    sampleProcessingStarted?: boolean;
  }

  export function createFile(): MP4File;
}

declare global {
  interface Window {
    VideoDecoder: typeof VideoDecoder;
    VideoEncoder: typeof VideoEncoder;
    AudioDecoder: typeof AudioDecoder;
    AudioEncoder: typeof AudioEncoder;
    EncodedVideoChunk: typeof EncodedVideoChunk;
    EncodedAudioChunk: typeof EncodedAudioChunk;
    VideoFrame: typeof VideoFrame;
    AudioFrame: typeof AudioFrame;
    ImageDecoder: typeof ImageDecoder;
    ImageTrack: typeof ImageTrack;
  }
}

export {};
