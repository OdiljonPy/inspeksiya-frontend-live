import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

// Assume global types from SDK - you'll need to declare these in a .d.ts file
declare global {
  interface Window {
    JSPlugin?: new (options: JSPluginOptions) => JSPluginInstance;
    TimeBar?: new (
      canvas: HTMLCanvasElement,
      width: number,
      height: number,
      options?: TimeBarOptions
    ) => TimeBarInstance;
  }
}

interface JSPluginOptions {
  szId: string;
  iWidth: number;
  iHeight: number;
  iMaxSplit: number;
  iCurrentSplit: number;
  szBasePath: string;
  oStyle: {
    border: string;
    borderSelect: string;
    background: string;
  };
}

interface JSPluginInstance {
  JS_SetWindowControlCallback(callbacks: WindowControlCallbacks): Promise<void>;
  JS_DestroyWorker(): Promise<void>;
  JS_Play(
    url: string,
    params: PlayParams,
    iWnd?: number,
    startTime?: string,
    endTime?: string
  ): Promise<void>;
  JS_Stop(iWnd: number): Promise<void>;
  JS_Pause(iWnd: number): Promise<void>;
  JS_Resume(iWnd: number): Promise<void>;
  JS_Slow(iWnd: number): Promise<void>;
  JS_Fast(iWnd: number): Promise<void>;
  JS_FrameForward(iWnd: number): Promise<void>;
  JS_GetOSDTime(iWnd: number, type: string): Promise<OSDTime | null>;
  JS_OpenSound(iWnd: number): Promise<void>;
  JS_CloseSound(iWnd: number): Promise<void>;
  JS_EnableZoom(iWnd: number): Promise<void>;
  JS_DisableZoom(iWnd: number): Promise<void>;
  JS_SetVolume(iWnd: number, volume: number): Promise<void>;
  JS_GetVolume(iWnd: number): Promise<number>;
  JS_SelectWnd(iWnd: number): Promise<void>;
  JS_CapturePicture(iWnd: number, target: string, type: string): Promise<void>;
  JS_StopRealPlayAll(): Promise<void>;
  JS_ArrangeWindow(split: number, bEnable: boolean): Promise<void>;
  JS_FullScreenDisplay(full: boolean): Promise<void>;
  JS_FullScreenSingle(iWnd: number): Promise<void>;
  JS_Resize(width: number, height: number): Promise<void>;
  JS_StartSaveEx(
    iWnd: number,
    fileName: string,
    targetType: number,
    options?: SaveOptions
  ): Promise<void>;
  JS_StopSave(iWnd: number): Promise<void>;
  JS_StartEZUITalk(params: TalkParams, callback?: (info: any) => void): Promise<void>;
  JS_StopEZUITalk(): Promise<void>;
  JS_DownloadFile(url: string, params: DownloadParams): Promise<string | null>; // returns UUID
  JS_StopDownloadFile(uuid: string): Promise<void>;
  JS_VideoSearch(params: VideoSearchParams): Promise<VideoRecord[] | null>;
  JS_SetSecretKey(iWnd: number, key: string): Promise<void>;
  JS_InitDataTransform(
    fileName: string,
    targetType: number,
    options?: any,
    secretKey?: string
  ): Promise<string>; // UUID
  JS_InputTransformData(uuid: string, data: Uint8Array): void;
  JS_StopTransformData(uuid: string): Promise<void>;
}

interface TimeBarOptions {
  backgroundColor: string;
  partLineColor: string;
  timeScaleColor: string;
  middleLineColor: string;
  middleLineTimeColor: string;
}

interface TimeBarInstance {
  setMouseDownCallback(cb: () => void): void;
  setMouseUpCallback(cb: () => void): void;
  addFile(start: string, end: string, type: number): void;
  clearWndFileList(): void;
  setMidLineTime(time: string): void;
  repaint(): void;
  setSpanType(type: number): void;
  m_tCurrentMidTime?: { getStringTime: () => string };
}

interface WindowControlCallbacks {
  windowEventSelect: (iWndIndex: number) => void;
  secretKeyError: (iWndIndex: number) => void;
  pluginErrorHandler: (iWndIndex: number, iErrorCode: number, oError: any) => void;
  windowEventOver: (iWndIndex: number) => void;
  windowEventOut: (iWndIndex: number) => void;
  windowEventUp: (iWndIndex: number) => void;
  windowFullScreenChange: (bFull: boolean) => void;
  firstFrameCallBack: (iWndIndex: number) => void;
  performanceLack: () => void;
}

interface PlayParams {
  playURL: string;
  ezuikit: boolean;
  env?: { domain: string };
  accessToken: string;
  mode: 'media';
}

interface SaveOptions {
  secretKey?: string;
}

interface TalkParams {
  accessToken: string;
  channelNo: number;
  deviceSerial: string;
  env?: { domain: string };
}

interface DownloadParams {
  playURL: string;
  fileName: string;
  idstType: number;
  secretKey?: string;
  startTime: string;
  endTime: string;
  ezuikit: boolean;
  env?: { domain: string };
  accessToken: string;
  mode: 'media';
}

interface VideoSearchParams {
  domain: string;
  accessToken: string;
  deviceSerial: string;
  channelNo: number;
  startTime: string;
  endTime: string;
  storageType: number; // 1 cloud, 2 local
}

interface VideoRecord {
  startTime: number;
  endTime: number;
}

interface OSDTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  milliSecond: number;
}

// Props interface
interface HikPlayerProps {
  accessToken: string;
  secretKey?: string;
  serialNumber: string;
  channelNumber: number;
  domain: string;
  width?: number;
  height?: number;
  maxSplit?: number;
  currentSplit?: number;
  basePath?: string;
  mode?: 'live' | 'playback'; // default 'live'
  startTime?: string; // for playback
  endTime?: string; // for playback
  storageType?: 'local' | 'cloud'; // for playback, default 'cloud'
  videoResolution?: 'sd' | 'hd'; // for live, default 'sd'
  onError?: (error: string) => void;
  onFirstFrame?: (windowIndex: number) => void;
}

export const HikPlayer: React.FC<HikPlayerProps> = ({
  accessToken,
  secretKey,
  serialNumber,
  channelNumber,
  domain,
  width = 600,
  height = 400,
  maxSplit = 4,
  currentSplit = 1,
  basePath = './dist',
  mode = 'live',
  startTime,
  endTime,
  storageType = 'cloud',
  videoResolution = 'sd',
  onError,
  onFirstFrame
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const timeBarRef = useRef<HTMLCanvasElement>(null);
  const [plugin, setPlugin] = useState<JSPluginInstance | null>(null);
  const [timeBar, setTimeBar] = useState<TimeBarInstance | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const currentWindowRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(50);
  const playbackInfoRef = useRef<any>(null);
  const fileListMapRef = useRef<{ [key: number]: any[] }>({});
  const intervalRef = useRef<number | null>(null);
  const downloadUUIDRef = useRef<string | null>(null);

  const loadScript = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }, []);

  const loadScripts = useCallback(async () => {
    if (scriptsLoaded) return;
    try {
      await loadScript(`${basePath}/jsPlugin-3.0.0.min.js`);
      await loadScript(`${basePath}/timeBar.js`);
      setScriptsLoaded(true);
    } catch (error) {
      onError?.(`Script loading failed: ${(error as Error).message}`);
      console.error('Script loading error:', error);
    }
  }, [basePath, scriptsLoaded, loadScript, onError]);

  const formattedDate = useCallback((timestamp: number): string => {
    const timeZoneOffset = new Date().getTimezoneOffset() / -60;
    const date = new Date(timestamp - timeZoneOffset * 60 * 60 * 1000);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
      .getHours()
      .toString()
      .padStart(
        2,
        '0'
      )}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  }, []);

  const getOSDTime = useCallback((time: OSDTime | null): number | null => {
    if (!time) return null;
    const szDate = `${time.year}-${time.month}-${time.day} ${time.hour}:${time.minute}:${time.second}`;
    return new Date(szDate).getTime() + time.milliSecond;
  }, []);

  const startIntervalGetTime = useCallback(() => {
    if (!timeBar || !plugin || intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      try {
        const osd = await plugin.JS_GetOSDTime(currentWindowRef.current, 'standard');
        const timestamp = getOSDTime(osd);
        if (timestamp) {
          const timeZoneOffset = new Date().getTimezoneOffset() / -60;
          const adjustedTime = timestamp + timeZoneOffset * 60 * 60 * 1000;
          const OSDTime = new Date(adjustedTime).toISOString().slice(0, 19).replace('T', ' ');
          timeBar.setMidLineTime(OSDTime);
        }
      } catch (e) {
        console.error('getOSDTime error', e);
      }
    }, 1000);
  }, [timeBar, plugin, getOSDTime]);

  const stopIntervalGetTime = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const seekPlayback = useCallback(async () => {
    if (!timeBar || !plugin || !playbackInfoRef.current) return;
    const szCurMidTime = timeBar.m_tCurrentMidTime?.getStringTime() || '';
    let szStartDate = szCurMidTime.replace(' ', 'T') + 'Z';
    const {
      url,
      endDate,
      secretKey: playSecretKey,
      accessToken: playAccessToken,
      domain: playDomain
    } = playbackInfoRef.current;
    const isCloud = storageType === 'cloud';

    if (isCloud) {
      const timeZoneOffset = new Date().getTimezoneOffset() / -60;
      const start = new Date(szStartDate).getTime() + timeZoneOffset * 60 * 60 * 1000;
      szStartDate =
        new Date(start).toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '') + 'Z';
    } else {
      szStartDate = szStartDate.replace(/-/g, '').replace(/:/g, '');
    }

    const newUrl = `${url}?begin=${szStartDate}&end=${endDate}`;

    if (playSecretKey) {
      await plugin.JS_SetSecretKey(currentWindowRef.current, playSecretKey);
    }

    await plugin.JS_Play(
      newUrl,
      {
        playURL: newUrl,
        ezuikit: true,
        env: { domain: playDomain },
        accessToken: playAccessToken,
        mode: 'media'
      },
      currentWindowRef.current,
      szStartDate,
      endDate
    );

    setTimeout(startIntervalGetTime, 2000);
  }, [timeBar, plugin, storageType, startIntervalGetTime]);

  const initTimeBar = useCallback(() => {
    const canvas = timeBarRef.current;
    if (!canvas || !window.TimeBar) return;
    const options: TimeBarOptions = {
      backgroundColor: 'rgb(0, 0, 0)',
      partLineColor: 'rgb(0,0,0)',
      timeScaleColor: 'rgb(150, 250, 150)',
      middleLineColor: 'rgb(0, 250, 0)',
      middleLineTimeColor: 'rgb(0, 250, 0)'
    };
    const newTimeBar = new window.TimeBar(canvas, width, 40, options);
    newTimeBar.setMouseDownCallback(stopIntervalGetTime);
    newTimeBar.setMouseUpCallback(() => {
      seekPlayback();
      setTimeout(startIntervalGetTime, 1000);
    });
    setTimeBar(newTimeBar);
  }, [width, stopIntervalGetTime, seekPlayback, startIntervalGetTime]);

  const repaintTimeBar = useCallback(
    (wndIndex: number) => {
      if (!timeBar) return;
      timeBar.clearWndFileList();
      const fileList = fileListMapRef.current[wndIndex] || [];
      fileList.forEach((file) => timeBar.addFile(file.start, file.end, file.type));
      timeBar.repaint();
    },
    [timeBar]
  );

  const initPlugin = useCallback(() => {
    if (!playerRef.current || !window.JSPlugin || plugin) return;
    const options: JSPluginOptions = {
      szId: playerRef.current.id,
      iWidth: width,
      iHeight: height,
      iMaxSplit: maxSplit,
      iCurrentSplit: currentSplit,
      szBasePath: basePath,
      oStyle: {
        border: '#343434',
        borderSelect: 'red',
        background: '#4C4B4B'
      }
    };
    const newPlugin = new window.JSPlugin(options);
    setPlugin(newPlugin);

    newPlugin
      .JS_SetWindowControlCallback({
        windowEventSelect: (iWndIndex: number) => {
          currentWindowRef.current = iWndIndex;
          repaintTimeBar(iWndIndex);
        },
        secretKeyError: (iWndIndex: number) => console.log('secretKey Error!', iWndIndex),
        pluginErrorHandler: (iWndIndex: number, iErrorCode: number, oError: any) => {
          console.log(iWndIndex, iErrorCode, oError);
          onError?.(`Plugin error: ${iErrorCode}`);
        },
        windowEventOver: () => {},
        windowEventOut: () => {},
        windowEventUp: () => {},
        windowFullScreenChange: (bFull: boolean) => console.log('Full screen change:', bFull),
        firstFrameCallBack: (iWndIndex: number) => {
          console.log('First frame:', iWndIndex);
          onFirstFrame?.(iWndIndex);
        },
        performanceLack: () => console.log('Performance lack')
      })
      .catch((e) => {
        console.error('Failed to set callbacks', e);
        onError?.('Failed to initialize plugin callbacks');
      });
  }, [
    width,
    height,
    maxSplit,
    currentSplit,
    basePath,
    repaintTimeBar,
    onError,
    onFirstFrame,
    plugin
  ]);

  useEffect(() => {
    loadScripts().then(() => {
      if (window.JSPlugin) {
        initPlugin();
      } else {
        // Poll for script load if needed
        const poll = setInterval(() => {
          if (window.JSPlugin) {
            clearInterval(poll);
            initPlugin();
          }
        }, 100);
        if (poll) setTimeout(() => clearInterval(poll), 5000); // timeout after 5s
      }
    });

    return () => {
      stopIntervalGetTime();
      if (plugin) {
        plugin.JS_DestroyWorker().catch(console.error);
      }
    };
  }, [loadScripts, initPlugin, stopIntervalGetTime, plugin]);

  useEffect(() => {
    if (mode === 'playback' && startTime && endTime && plugin && scriptsLoaded) {
      initTimeBar();
    }
  }, [mode, startTime, endTime, plugin, scriptsLoaded, initTimeBar]);

  const startLive = useCallback(async () => {
    if (!plugin || !accessToken || !serialNumber || channelNumber < 1) return;
    const url = `ezopen://open.ezviz.com/${serialNumber}/${channelNumber}${videoResolution === 'hd' ? '.hd.live' : '.live'}`;
    if (secretKey) {
      await plugin.JS_SetSecretKey(currentWindowRef.current, secretKey);
    }
    await plugin.JS_Play(
      url,
      {
        playURL: url,
        ezuikit: true,
        env: { domain },
        accessToken,
        mode: 'media'
      },
      currentWindowRef.current
    );
    setIsPlaying(true);
  }, [plugin, accessToken, serialNumber, channelNumber, videoResolution, secretKey, domain]);

  const startPlayback = useCallback(async () => {
    if (!plugin || !accessToken || !serialNumber || !startTime || !endTime || channelNumber < 1)
      return;
    const searchParams: VideoSearchParams = {
      domain,
      accessToken,
      deviceSerial: serialNumber,
      channelNo: channelNumber,
      startTime,
      endTime,
      storageType: storageType === 'cloud' ? 1 : 2
    };
    const records = await plugin.JS_VideoSearch(searchParams);
    fileListMapRef.current[currentWindowRef.current] =
      records?.map((item) => ({
        start: formattedDate(item.startTime),
        end: formattedDate(item.endTime),
        type: 1
      })) || [];
    repaintTimeBar(currentWindowRef.current);

    let szStartDate = startTime;
    let szEndDate = endTime;
    const isCloud = storageType === 'cloud';
    const url = `ezopen://open.ezviz.com/${serialNumber}/${channelNumber}.${storageType}.rec`;

    if (isCloud) {
      const timeZoneOffset = new Date().getTimezoneOffset() / -60;
      const start = new Date(startTime).getTime() + timeZoneOffset * 60 * 60 * 1000;
      const end = new Date(endTime).getTime() + timeZoneOffset * 60 * 60 * 1000;
      szStartDate =
        new Date(start).toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '') + 'Z';
      szEndDate =
        new Date(end).toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '') + 'Z';
    } else {
      szStartDate = szStartDate.replace(/-/g, '').replace(/:/g, '');
      szEndDate = szEndDate.replace(/-/g, '').replace(/:/g, '');
    }

    playbackInfoRef.current = {
      url,
      secretKey,
      accessToken,
      domain,
      startDate: szStartDate,
      endDate: szEndDate
    };

    if (secretKey) {
      await plugin.JS_SetSecretKey(currentWindowRef.current, secretKey);
    }

    const playUrl = `${url}?begin=${szStartDate}&end=${szEndDate}`;
    await plugin.JS_Play(
      playUrl,
      {
        playURL: playUrl,
        ezuikit: true,
        env: { domain },
        accessToken,
        mode: 'media'
      },
      currentWindowRef.current,
      szStartDate,
      szEndDate
    );
    setIsPlaying(true);
    setTimeout(startIntervalGetTime, 2000);
  }, [
    plugin,
    accessToken,
    serialNumber,
    channelNumber,
    startTime,
    endTime,
    storageType,
    domain,
    secretKey,
    formattedDate,
    repaintTimeBar,
    startIntervalGetTime
  ]);

  const stopPlay = useCallback(async () => {
    if (!plugin) return;
    stopIntervalGetTime();
    await plugin.JS_Stop(currentWindowRef.current);
    setIsPlaying(false);
  }, [plugin, stopIntervalGetTime]);

  const pause = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_Pause(currentWindowRef.current);
  }, [plugin]);

  const resume = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_Resume(currentWindowRef.current);
  }, [plugin]);

  const fast = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_Fast(currentWindowRef.current);
  }, [plugin]);

  const slow = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_Slow(currentWindowRef.current);
  }, [plugin]);

  const frameForward = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_FrameForward(currentWindowRef.current);
  }, [plugin]);

  const getOSD = useCallback(async () => {
    if (!plugin) return;
    const time = await plugin.JS_GetOSDTime(currentWindowRef.current, 'standard');
    if (time) {
      const osd = `${time.year}-${time.month}-${time.day} ${time.hour}:${time.minute}:${time.second}`;
      console.log('OSD Time:', osd); // Or update state for display
    }
  }, [plugin]);

  const openSound = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_OpenSound(currentWindowRef.current);
  }, [plugin]);

  const closeSound = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_CloseSound(currentWindowRef.current);
  }, [plugin]);

  const enableZoom = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_EnableZoom(currentWindowRef.current);
  }, [plugin]);

  const disableZoom = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_DisableZoom(currentWindowRef.current);
  }, [plugin]);

  const setVol = useCallback(
    async (vol: number) => {
      setVolume(vol);
      if (!plugin) return;
      await plugin.JS_SetVolume(currentWindowRef.current, vol);
    },
    [plugin]
  );

  const getVol = useCallback(async () => {
    if (!plugin) return 0;
    return await plugin.JS_GetVolume(currentWindowRef.current);
  }, [plugin]);

  const capturePicture = useCallback(
    async (type: 'BMP' | 'JPEG') => {
      if (!plugin) return;
      await plugin.JS_CapturePicture(currentWindowRef.current, 'img', type);
    },
    [plugin]
  );

  const startRecord = useCallback(async () => {
    if (!plugin) return;
    const szTime = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 15);
    const targetType = 5; // MP4
    await plugin.JS_StartSaveEx(currentWindowRef.current, `video_${szTime}.mp4`, targetType, {
      secretKey
    });
    setIsRecording(true);
  }, [plugin, secretKey]);

  const stopRecord = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_StopSave(currentWindowRef.current);
    setIsRecording(false);
  }, [plugin]);

  const startTalk = useCallback(async () => {
    if (!plugin) return;
    const params: TalkParams = {
      accessToken,
      channelNo: channelNumber,
      deviceSerial: serialNumber,
      env: { domain }
    };
    await plugin.JS_StartEZUITalk(params, (info) => console.log('Talk info:', info));
  }, [plugin, accessToken, channelNumber, serialNumber, domain]);

  const stopTalk = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_StopEZUITalk();
  }, [plugin]);

  const startDownload = useCallback(async () => {
    if (!plugin || !startTime || !endTime) return;
    // Similar to playback URL construction
    const isCloud = storageType === 'cloud';
    let szStartDate = startTime;
    let szEndDate = endTime;
    if (isCloud) {
      const timeZoneOffset = new Date().getTimezoneOffset() / -60;
      const start = new Date(startTime).getTime() + timeZoneOffset * 60 * 60 * 1000;
      const end = new Date(endTime).getTime() + timeZoneOffset * 60 * 60 * 1000;
      szStartDate =
        new Date(start).toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '') + 'Z';
      szEndDate =
        new Date(end).toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '') + 'Z';
    } else {
      szStartDate = szStartDate.replace(/-/g, '').replace(/:/g, '');
      szEndDate = szEndDate.replace(/-/g, '').replace(/:/g, '');
    }
    const url = `ezopen://open.ezviz.com/${serialNumber}/${channelNumber}.${storageType}.rec?begin=${szStartDate}&end=${szEndDate}`;
    const fileName = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);
    const uuid = await plugin.JS_DownloadFile(url, {
      playURL: url,
      fileName,
      idstType: 5, // MP4
      secretKey,
      startTime: szStartDate,
      endTime: szEndDate,
      ezuikit: true,
      env: { domain },
      accessToken,
      mode: 'media'
    });
    downloadUUIDRef.current = uuid || null;
  }, [
    plugin,
    startTime,
    endTime,
    storageType,
    serialNumber,
    channelNumber,
    secretKey,
    domain,
    accessToken
  ]);

  const stopDownload = useCallback(async () => {
    if (!plugin || !downloadUUIDRef.current) return;
    await plugin.JS_StopDownloadFile(downloadUUIDRef.current);
    downloadUUIDRef.current = null;
  }, [plugin]);

  const arrangeWindow = useCallback(
    async (split: number) => {
      if (!plugin) return;
      await plugin.JS_ArrangeWindow(split, false);
    },
    [plugin]
  );

  const fullScreenAll = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_FullScreenDisplay(true);
  }, [plugin]);

  const fullScreenSingle = useCallback(async () => {
    if (!plugin) return;
    await plugin.JS_FullScreenSingle(currentWindowRef.current);
  }, [plugin]);

  const selectWindow = useCallback(
    async (wnd: number) => {
      if (!plugin) return;
      await plugin.JS_SelectWnd(wnd);
    },
    [plugin]
  );

  const handleResize = useCallback(() => {
    if (!plugin) return;
    plugin.JS_Resize(width, height);
  }, [plugin, width, height]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!scriptsLoaded || !plugin) return;
    if (mode === 'live') {
      startLive();
    } else if (mode === 'playback' && startTime && endTime) {
      startPlayback();
    }
  }, [mode, scriptsLoaded, plugin, startLive, startPlayback, startTime, endTime]);

  const renderControls = () => (
    <div
      className='controls'
      style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px' }}
    >
      {/* Play/Stop */}
      <Button onClick={isPlaying ? stopPlay : mode === 'live' ? startLive : startPlayback}>
        {isPlaying ? 'Stop' : 'Start'}
      </Button>
      {mode === 'playback' && (
        <>
          <Button onClick={pause}>Pause</Button>
          <Button onClick={resume}>Resume</Button>
          <Button onClick={fast}>Fast</Button>
          <Button onClick={slow}>Slow</Button>
          <Button onClick={frameForward}>Frame Forward</Button>
        </>
      )}
      <Button onClick={getOSD}>Get OSD Time</Button>

      {/* Record */}
      <Button onClick={isRecording ? stopRecord : startRecord} disabled={!isPlaying}>
        {isRecording ? 'Stop Record' : 'Start Record'}
      </Button>

      {/* Capture */}
      <Button onClick={() => capturePicture('BMP')} disabled={!isPlaying}>
        Capture BMP
      </Button>
      <Button onClick={() => capturePicture('JPEG')} disabled={!isPlaying}>
        Capture JPEG
      </Button>

      {/* Audio */}
      <Button onClick={openSound} disabled={!isPlaying}>
        Audio On
      </Button>
      <Button onClick={closeSound} disabled={!isPlaying}>
        Audio Off
      </Button>
      <input
        type='range'
        min={0}
        max={100}
        value={volume}
        onChange={(e) => setVol(parseInt(e.target.value))}
        style={{ width: '100px' }}
      />
      <Button onClick={getVol}>Get Volume</Button>

      {/* Zoom */}
      <Button onClick={enableZoom} disabled={!isPlaying}>
        Enable Zoom
      </Button>
      <Button onClick={disableZoom} disabled={!isPlaying}>
        Disable Zoom
      </Button>

      {/* Talk */}
      <Button onClick={startTalk} disabled={!isPlaying}>
        Start Talk
      </Button>
      <Button onClick={stopTalk} disabled={!isPlaying}>
        Stop Talk
      </Button>

      {/* Download - only for playback */}
      {mode === 'playback' && (
        <>
          <Button onClick={startDownload}>Start Download</Button>
          <Button onClick={stopDownload}>Stop Download</Button>
        </>
      )}

      {/* Window */}
      {[1, 4, 9, 16].map((s) => (
        <Button key={s} onClick={() => arrangeWindow(Math.sqrt(s))}>
          {Math.sqrt(s)}x{Math.sqrt(s)}
        </Button>
      ))}
      <Button onClick={fullScreenAll}>Full Screen All</Button>
      <Button onClick={fullScreenSingle}>Full Screen Single</Button>
      <Button onClick={() => selectWindow(0)}>Select Window 0</Button>

      {/* Stop All Realplay */}
      <Button onClick={async () => plugin?.JS_StopRealPlayAll()}>Stop All</Button>
    </div>
  );

  if (!scriptsLoaded) {
    return <div>Loading scripts...</div>;
  }

  return (
    <div className='space-y-5'>
      <div className='player-container' style={{ flex: 1 }}>
        <div id='playWind' ref={playerRef} style={{ width, height, border: '1px solid #ccc' }} />
        {mode === 'playback' && <canvas ref={timeBarRef} style={{ width, height: 40 }} />}
      </div>
      <div className='controls-container' style={{ minWidth: '300px' }}>
        {renderControls()}
        {mode === 'playback' && timeBar && (
          <div>
            <Button onClick={() => timeBar.setSpanType(7)}>Expand Timebar</Button>
            <Button onClick={() => timeBar.setSpanType(8)}>Narrow Timebar</Button>
          </div>
        )}
      </div>
    </div>
  );
};
