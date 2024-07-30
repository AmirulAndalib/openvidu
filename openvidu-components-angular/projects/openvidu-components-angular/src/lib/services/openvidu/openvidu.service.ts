import { Injectable } from '@angular/core';
import { ILogger } from '../../models/logger.model';
import { DeviceService } from '../device/device.service';
import { LoggerService } from '../logger/logger.service';
import {
	AudioCaptureOptions,
	ConnectionState,
	CreateLocalTracksOptions,
	LocalAudioTrack,
	LocalTrack,
	LocalVideoTrack,
	Room,
	RoomOptions,
	Track,
	VideoCaptureOptions,
	VideoPresets,
	createLocalTracks
} from 'livekit-client';
import { StorageService } from '../storage/storage.service';

@Injectable({
	providedIn: 'root'
})
export class OpenViduService {
	/*
	 * @internal
	 */
	// isSttReadyObs: Observable<boolean>;
	// private STT_TIMEOUT_MS = 2 * 1000;
	// private sttReconnectionTimeout: NodeJS.Timeout;
	// private _isSttReady: BehaviorSubject<boolean> = new BehaviorSubject(true);

	private room: Room;

	/*
	 * Tracks used in the prejoin component. They are created when the room is not yet created.
	 */
	private localTracks: LocalTrack[] = [];
	private livekitToken = '';
	private livekitUrl = '';
	private livekitRoomAdmin = false;
	private log: ILogger;

	/**
	 * @internal
	 */
	constructor(
		private loggerSrv: LoggerService,
		private deviceService: DeviceService,
		private storageService: StorageService
	) {
		this.log = this.loggerSrv.get('OpenViduService');
		// this.isSttReadyObs = this._isSttReady.asObservable();
	}

	/**
	 * Creates a new Room with audio and video devices selected or default ones.
	 * @internal
	 */
	initRoom(): void {
		const videoDeviceId = this.deviceService.getCameraSelected()?.device ?? undefined;
		const audioDeviceId = this.deviceService.getMicrophoneSelected()?.device ?? undefined;
		const roomOptions: RoomOptions = {
			adaptiveStream: true,
			dynacast: true,
			audioCaptureDefaults: {
				deviceId: audioDeviceId,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true
			},
			videoCaptureDefaults: {
				deviceId: videoDeviceId,
				resolution: VideoPresets.h720.resolution
			},
			publishDefaults: {
				dtx: true,
				simulcast: true,
				stopMicTrackOnMute: true
			},
			stopLocalTrackOnUnpublish: true,
			disconnectOnPageLeave: true
		};
		this.room = new Room(roomOptions);
	}

	/**
	 * Connects to the Room
	 */
	async connectRoom(): Promise<void> {
		try {
			await this.room.connect(this.livekitUrl, this.livekitToken);
			this.log.d(`Successfully connected to room ${this.room.name}`);
			const participantName = this.storageService.getParticipantName();
			if (participantName) {
				this.room.localParticipant.setName(participantName);
			}
		} catch (error) {
			this.log.e('Error connecting to room:', error);
			throw { code: 'CONNECTION_ERROR', message: `Error connecting to the server at the following URL: ${this.livekitUrl}` };
		}
	}

	/**
	 * Disconnects the room
	 */
	async disconnectRoom(): Promise<void> {
		if (this.isRoomConnected()) {
			this.log.d('Disconnecting room');
			await this.room.disconnect();
		}
	}

	/**
	 * @returns Room instance
	 */
	getRoom(): Room {
		if (!this.room) {
			this.log.e('Room is not initialized');
			throw new Error('Room is not initialized');
		}
		return this.room;
	}

	/**
	 * Returns the room name
	 */
	getRoomName(): string {
		return this.room?.name;
	}

	/**
	 * Returns the room metadata from the token
	 * @returns
	 */
	getRoomMetadata(): { roomAdmin: boolean } {
		return {
			roomAdmin: this.livekitRoomAdmin
		};
	}

	/**
	 * Returns if the room is connected or not
	 * @returns
	 */
	isRoomConnected(): boolean {
		return this.room?.state === ConnectionState.Connected;
	}

	/**
	 * @internal
	 */
	initializeAndSetToken(token: string, livekitUrl: string): void {
		const livekitData = this.extractLivekitData(token, livekitUrl);
		this.livekitToken = token;
		this.livekitUrl = livekitData.livekitUrl;
		this.livekitRoomAdmin = livekitData.livekitRoomAdmin;

		if (!this.livekitUrl) {
			this.log.e('LiveKit URL is not defined. Please, check the livekitUrl parameter of the VideoConferenceComponent');
			throw new Error('Livekit URL is not defined');
		}
		// return this.room.prepareConnection(this.livekitUrl, this.livekitToken);
	}

	/**
	 * Sets the local tracks for the OpenVidu service.
	 *
	 * @param tracks - An array of LocalTrack objects representing the local tracks to be set.
	 * @returns void
	 * @internal
	 */
	setLocalTracks(tracks: LocalTrack[]): void {
		this.localTracks = tracks;
	}

	/**
	 * @internal
	 * @returns
	 */
	getLocalTracks(): LocalTrack[] {
		return this.localTracks;
	}

	/**
	 * @internal
	 **/
	removeLocalTracks(): void {
		this.localTracks.forEach((track) => {
			track.stop();
			track.detach();
		});
		this.localTracks = [];
	}

	/**
	 * Creates local tracks for video and audio devices.
	 *
	 * @param videoDeviceId - The ID of the video device to use. If not provided, the default video device will be used.
	 * @param audioDeviceId - The ID of the audio device to use. If not provided, the default audio device will be used.
	 * @returns A promise that resolves to an array of LocalTrack objects representing the created tracks.
	 * @internal
	 */
	async createLocalTracks(
		videoDeviceId: string | boolean | undefined = undefined,
		audioDeviceId: string | boolean | undefined = undefined
	): Promise<LocalTrack[]> {
		// If video and audio device IDs are not provided, check if they are enabled and use the default devices
		if (videoDeviceId === undefined) videoDeviceId = this.deviceService.isCameraEnabled();
		if (audioDeviceId === undefined) audioDeviceId = this.deviceService.isMicrophoneEnabled();

		let options: CreateLocalTracksOptions = {
			audio: { echoCancellation: true, noiseSuppression: true },
			video: {}
		};

		// Video device
		if (videoDeviceId === true) {
			if (this.deviceService.hasVideoDeviceAvailable()) {
				videoDeviceId = this.deviceService.getCameraSelected()?.device || 'default';
				(options.video as VideoCaptureOptions).deviceId = videoDeviceId;
			} else {
				options.video = false;
			}
		} else if (videoDeviceId === false) {
			options.video = false;
		} else {
			(options.video as VideoCaptureOptions).deviceId = videoDeviceId;
		}

		// Audio device
		if (audioDeviceId === true) {
			if (this.deviceService.hasAudioDeviceAvailable()) {
				audioDeviceId = this.deviceService.getMicrophoneSelected()?.device || 'default';
				(options.audio as AudioCaptureOptions).deviceId = audioDeviceId;
			} else {
				options.audio = false;
			}
		} else if (audioDeviceId === false) {
			options.audio = false;
		} else {
			(options.audio as AudioCaptureOptions).deviceId = audioDeviceId;
		}

		let newLocalTracks: LocalTrack[] = [];
		if (options.audio || options.video) {
			this.log.d('Creating local tracks with options', options);
			newLocalTracks = await createLocalTracks(options);
			if (!this.deviceService.isCameraEnabled()) {
				const videoTrack = newLocalTracks.find((track) => track.kind === Track.Kind.Video);
				if (videoTrack) videoTrack.mute();
			}
			if (!this.deviceService.isMicrophoneEnabled()) {
				const audioTrack = newLocalTracks.find((track) => track.kind === Track.Kind.Audio);
				if (audioTrack) audioTrack.mute();
			}
		}
		return newLocalTracks;
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called from the prejoin component.
	 **/
	async setVideoTrackEnabled(enabled: boolean) {
		let videoTrack = this.localTracks?.find((track) => track.kind === Track.Kind.Video);
		// Room is not connected, so we can't enable/disable the camera
		if (enabled) {
			await videoTrack?.unmute();
		} else {
			await videoTrack?.mute();
		}
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called from the prejoin component.
	 **/
	async setAudioTrackEnabled(enabled: boolean) {
		const audioTrack = this.localTracks?.find((track) => track.kind === Track.Kind.Audio);
		// Session is not connected, so we can't enable/disable the camera
		if (enabled) {
			await audioTrack?.unmute();
		} else {
			await audioTrack?.mute();
		}
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called before connect to room.
	 **/
	isVideoTrackEnabled(): boolean {
		if (this.localTracks.length === 0) {
			return this.deviceService.isCameraEnabled();
		}
		const videoTrack = this.localTracks.find((track) => track.kind === Track.Kind.Video);
		return !!videoTrack && !videoTrack.isMuted;
	}

	/**
	 * @internal
	 * As the Room is not created yet, we need to handle the media tracks with a temporary array of tracks.
	 * This method must be only called before connect to room.
	 **/
	isAudioTrackEnabled(): boolean {
		if (this.localTracks.length === 0) {
			return this.deviceService.isMicrophoneEnabled();
		}
		const audioTrack = this.localTracks.find((track) => track.kind === Track.Kind.Audio);
		return !!audioTrack && !audioTrack.isMuted;
	}

	/**
	 * Switch the microphone device when the room is not connected (prejoin page)
	 * @param deviceId new video device to use
	 * @internal
	 */
	switchCamera(deviceId: string): Promise<void> {
		return (this.localTracks?.find((track) => track.kind === Track.Kind.Video) as LocalVideoTrack).restartTrack({ deviceId: deviceId });
	}

	/**
	 * Switches the microphone device when the room is not connected (prejoin page)
	 * @param deviceId new video device to use
	 * @internal
	 */
	switchMicrophone(deviceId: string): Promise<void> {
		return (this.localTracks?.find((track) => track.kind === Track.Kind.Audio) as LocalAudioTrack).restartTrack({ deviceId: deviceId });
	}

	/**
	 * Extracts Livekit data from the provided token and returns an object containing the Livekit URL and room admin status.
	 * @param token - The token to extract Livekit data from.
	 * @param livekitUrl - The default Livekit URL to use if no Livekit URL is found in the token metadata.
	 * @returns An object containing the Livekit URL and room admin status.
	 * @throws Error if there is an error decoding and parsing the token.
	 * @internal
	 */
	private extractLivekitData(token: string, livekitUrl: string): { livekitUrl: string; livekitRoomAdmin: boolean } {
		try {
			const response = { livekitUrl, livekitRoomAdmin: false };
			const base64Url = token.split('.')[1];
			const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
			const jsonPayload = decodeURIComponent(
				window
					.atob(base64)
					.split('')
					.map((c) => {
						return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
					})
					.join('')
			);

			const payload = JSON.parse(jsonPayload);
			if (payload?.metadata) {
				const tokenMetadata = JSON.parse(payload.metadata);
				if (tokenMetadata.livekitUrl) {
					response.livekitUrl = tokenMetadata.livekitUrl;
				}
				response.livekitRoomAdmin = tokenMetadata.roomAdmin;
			}

			return response;
		} catch (error) {
			throw new Error('Error decoding and parsing token: ' + error);
		}
	}

	/**
	 * @internal
	 * Whether the STT service is ready or not
	 * This will be `false` when the app receives a SPEECH_TO_TEXT_DISCONNECTED exception
	 * and it cannot subscribe to STT
	 */
	// isSttReady(): boolean {
	// 	return this._isSttReady.getValue();
	// }

	/**
	 * @internal
	 */
	// setSTTReady(value: boolean): void {
	// 	if (this._isSttReady.getValue() !== value) {
	// 		this._isSttReady.next(value);
	// 	}
	// }

	/**
	 * @internal
	 * Subscribe all `CAMERA` stream types to speech-to-text
	 * It will retry the subscription each `STT_TIMEOUT_MS`
	 *
	 * @param lang The language of the Stream's audio track.
	 */
	// async subscribeRemotesToSTT(lang: string): Promise<void> {
	// 	const participantService = this.injector.get(ParticipantService);
	// 	const remoteParticipants = participantService.getRemoteParticipants();
	// 	let successNumber = 0;
	// 	for (const p of remoteParticipants) {
	// 		const stream = p.getCameraConnection()?.streamManager?.stream;
	// 		if (stream) {
	// 			try {
	// 				await this.subscribeStreamToStt(stream, lang);
	// 				successNumber++;
	// 			} catch (error) {
	// 				this.log.e(`Error subscribing ${stream.streamId} to STT:`, error);
	// 				break;
	// 			}
	// 		}
	// 	}
	// 	this.setSTTReady(successNumber === remoteParticipants.length);
	// 	if (!this.isSttReady()) {
	// 		this.log.w('STT is not ready. Retrying subscription...');
	// 		this.sttReconnectionTimeout = setTimeout(this.subscribeRemotesToSTT.bind(this, lang), this.STT_TIMEOUT_MS);
	// 	}
	// }

	/**
	 * @internal
	 * Subscribe a stream to speech-to-text
	 * @param stream
	 * @param lang
	 */
	// async subscribeStreamToStt(stream: Stream, lang: string): Promise<void> {
	// 	await this.getWebcamSession().subscribeToSpeechToText(stream, lang);
	// 	this.log.d(`Subscribed stream ${stream.streamId} to STT with ${lang} language.`);
	// }

	/**
	 * @internal
	 * Unsubscribe to all `CAMERA` stream types to speech-to-text if STT is up(ready)
	 */
	// async unsubscribeRemotesFromSTT(): Promise<void> {
	// 	const participantService = this.injector.get(ParticipantService);
	// 	clearTimeout(this.sttReconnectionTimeout);
	// 	if (this.isSttReady()) {
	// 		for (const p of participantService.getRemoteParticipants()) {
	// 			const stream = p.getCameraConnection().streamManager.stream;
	// 			if (stream) {
	// 				try {
	// 					await this.getWebcamSession().unsubscribeFromSpeechToText(stream);
	// 				} catch (error) {
	// 					this.log.e(`Error unsubscribing ${stream.streamId} from STT:`, error);
	// 				}
	// 			}
	// 		}
	// 	}
	// }
}
