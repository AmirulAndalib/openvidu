import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BackgroundEffect, EffectType } from '../../models/background-effect.model';
import { ParticipantService } from '../participant/participant.service';
import { OpenViduService } from '../openvidu/openvidu.service';
import { StorageService } from '../storage/storage.service';
import { LocalVideoTrack, Track } from 'livekit-client';
import { BackgroundBlur, BackgroundOptions, ProcessorWrapper, VirtualBackground } from '@livekit/track-processors';
import { LoggerService } from '../logger/logger.service';
import { ILogger } from '../../models/logger.model';

/**
 * @internal
 */
@Injectable({
	providedIn: 'root'
})
export class VirtualBackgroundService {
	backgroundIdSelected = <BehaviorSubject<string>>new BehaviorSubject('');
	backgroundIdSelected$: Observable<string>;
	backgrounds: BackgroundEffect[] = [
		{ id: 'no_effect', type: EffectType.NONE, thumbnail: 'block' },
		{ id: 'soft_blur', type: EffectType.BLUR, thumbnail: 'blur_on' },
		{ id: 'hard_blur', type: EffectType.BLUR, thumbnail: 'blur_on' },
		{ id: '1', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-1.jpg', src: 'assets/backgrounds/bg-1.jpg' },
		{ id: '2', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-2.jpg', src: 'assets/backgrounds/bg-2.jpg' },
		{ id: '3', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-3.jpg', src: 'assets/backgrounds/bg-3.jpg' },
		{ id: '4', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-4.jpg', src: 'assets/backgrounds/bg-4.jpg' },
		{ id: '5', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-5.jpg', src: 'assets/backgrounds/bg-5.jpg' },
		{ id: '6', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-6.jpg', src: 'assets/backgrounds/bg-6.jpg' },
		{ id: '7', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-7.jpg', src: 'assets/backgrounds/bg-7.jpg' },
		{ id: '8', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-8.jpg', src: 'assets/backgrounds/bg-8.jpg' },
		{ id: '9', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-9.jpg', src: 'assets/backgrounds/bg-9.jpg' },
		{ id: '10', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-10.jpg', src: 'assets/backgrounds/bg-10.jpg' },
		{ id: '11', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-11.jpg', src: 'assets/backgrounds/bg-11.jpg' },
		{ id: '12', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-12.jpg', src: 'assets/backgrounds/bg-12.jpg' },
		{ id: '13', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-13.jpg', src: 'assets/backgrounds/bg-13.jpg' },
		{ id: '14', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-14.jpg', src: 'assets/backgrounds/bg-14.jpg' },
		{ id: '15', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-15.jpg', src: 'assets/backgrounds/bg-15.jpg' },
		{ id: '16', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-16.jpg', src: 'assets/backgrounds/bg-16.jpg' },
		{ id: '17', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-17.jpg', src: 'assets/backgrounds/bg-17.jpg' },
		{ id: '18', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-18.jpg', src: 'assets/backgrounds/bg-18.jpg' },
		{ id: '19', type: EffectType.IMAGE, thumbnail: 'assets/backgrounds/thumbnails/bg-19.jpg', src: 'assets/backgrounds/bg-19.jpg' }
	];

	private SOFT_BLUR_INTENSITY = 20;
	private HARD_BLUR_INTENSITY = 60;

	private log: ILogger;
	constructor(
		private participantService: ParticipantService,
		private openviduService: OpenViduService,
		private storageService: StorageService,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('VirtualBackgroundService');
		this.backgroundIdSelected$ = this.backgroundIdSelected.asObservable();
	}

	getBackgrounds(): BackgroundEffect[] {
		return this.backgrounds;
	}

	isBackgroundApplied(): boolean {
		const bgSelected = this.backgroundIdSelected.getValue();
		return !!bgSelected && bgSelected !== 'no_effect';
	}

	async applyBackgroundFromStorage() {
		const bgId = this.storageService.getBackground();
		if (!!bgId) {
			const background = this.backgrounds.find((bg) => bg.id === bgId);
			if (background) {
				this.applyBackground(background);
			}
		}
	}

	async applyBackground(bg: BackgroundEffect) {
		// If the background is already applied, do nothing
		if (this.backgroundIsAlreadyApplied(bg.id)) return;

		const cameraTrack = this.getCameraTrack();
		if (!cameraTrack) {
			this.log.e('No camera track found. Cannot apply background.');
			return;
		}

		try {
			// If no effect is selected, remove the background
			if (bg.type === EffectType.NONE) {
				await this.removeBackground();
				return;
			}

			const currentProcessor = cameraTrack.getProcessor() as ProcessorWrapper<BackgroundOptions>;

			// Check if the background is the same type as the previous one
			if (this.hasSameTypeAsPreviousOne(bg.type) && currentProcessor) {
				await this.replaceBackground(currentProcessor, bg);
			} else {
				// If the background is different, remove the previous one and apply the new one
				const newProcessor = this.getBackgroundProcessor(bg);
				if (!newProcessor) {
					this.log.e('No processor found for the background effect.');
					return;
				}
				await this.applyProcessorToCameraTrack(cameraTrack, newProcessor);
			}

			this.storageService.setBackground(bg.id);
			this.backgroundIdSelected.next(bg.id);
		} catch (error) {
			this.log.e('Error applying background effect:', error);
		}
	}

	private getBackgroundOptions(bg: BackgroundEffect): BackgroundOptions {
		if (bg.type === EffectType.IMAGE && bg.src) {
			return { imagePath: bg.src };
		} else if (bg.type === EffectType.BLUR) {
			return {
				blurRadius: bg.id === 'soft_blur' ? this.SOFT_BLUR_INTENSITY : this.HARD_BLUR_INTENSITY
			};
		}
		return {};
	}

	async removeBackground() {
		if (this.isBackgroundApplied()) {
			this.backgroundIdSelected.next('no_effect');
			const cameraTrack = this.getCameraTrack();
			if (cameraTrack) {
				try {
					await cameraTrack.stopProcessor();
				} catch (e) {
					this.log.w('Error stopping processor:', e);
				}
			}
			this.storageService.removeBackground();
		}
	}

	private getBackgroundProcessor(bg: BackgroundEffect): ProcessorWrapper<BackgroundOptions> | undefined {
		switch (bg.type) {
			case EffectType.IMAGE:
				if (bg.src) {
					return VirtualBackground(bg.src);
				}
				break;
			case EffectType.BLUR:
				if (bg.id === 'soft_blur') {
					return BackgroundBlur(this.SOFT_BLUR_INTENSITY);
				} else if (bg.id === 'hard_blur') {
					return BackgroundBlur(this.HARD_BLUR_INTENSITY);
				}
				break;
		}

		return undefined;
	}

	/**
	 * Gets the camera track from either the published tracks (if in room) or local tracks (if in prejoin)
	 * @returns The camera LocalTrack or undefined if not found
	 * @private
	 */
	private getCameraTrack(): LocalVideoTrack | undefined {
		// First, try to get from published tracks (when in room)
		if (this.openviduService.isRoomConnected()) {
			const localParticipant = this.participantService.getLocalParticipant();
			const cameraTrackPublication = localParticipant?.cameraTracks?.[0];
			if (cameraTrackPublication?.track) {
				return cameraTrackPublication.track as LocalVideoTrack;
			}
		}

		// Fallback to local tracks (when in prejoin or tracks not yet published)
		const localTracks = this.openviduService.getLocalTracks();
		const cameraTrack = localTracks.find((track) => track.kind === Track.Kind.Video);
		return cameraTrack as LocalVideoTrack | undefined;
	}

	/**
	 * Applies a background processor to the camera track
	 * @param cameraTrack The camera track to apply the processor to
	 * @param processor The background processor to apply
	 * @private
	 */
	private async applyProcessorToCameraTrack(cameraTrack: LocalVideoTrack, processor: ProcessorWrapper<BackgroundOptions>): Promise<void> {
		await cameraTrack.setProcessor(processor);
	}

	private backgroundIsAlreadyApplied(backgroundId: string): boolean {
		return backgroundId === this.backgroundIdSelected.getValue();
	}

	/**
	 * Replaces the current background effect with a new one by updating the processor options.
	 *
	 * @private
	 * @param currentProcessor - The current processor wrapper that handles background effects
	 * @param bg - The new background effect to apply
	 * @returns A Promise that resolves when the background options have been updated
	 * @throws Will throw an error if updating the background options fails
	 */
	private async replaceBackground(currentProcessor: ProcessorWrapper<BackgroundOptions>, bg: BackgroundEffect) {
		try {
			const options = this.getBackgroundOptions(bg);
			// Update the processor with the new options
			await currentProcessor.updateTransformerOptions(options);
			this.log.d('Background options updated:', options);
		} catch (error) {
			this.log.e('Error updating background options:', error);
			throw error;
		}
	}

	/**
	 * Checks if the currently selected background has the same effect type as the provided one.
	 *
	 * @param type - The effect type to compare with the currently selected background.
	 * @returns `true` if the currently selected background has the same effect type, `false` otherwise.
	 * @private
	 */
	private hasSameTypeAsPreviousOne(type: EffectType): boolean {
		const currentBgId = this.backgroundIdSelected.getValue();
		const currentBg = this.backgrounds.find((b) => b.id === currentBgId);
		const isSameEffectType = currentBg && currentBg.type === type;
		return !!isSameEffectType;
	}
}
