import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import {
	RecordingDeleteRequestedEvent,
	RecordingDownloadClickedEvent,
	RecordingInfo,
	RecordingPlayClickedEvent,
	RecordingStartRequestedEvent,
	RecordingStatus,
	RecordingStatusInfo,
	RecordingStopRequestedEvent
} from '../../../../models/recording.model';
import { ActionService } from '../../../../services/action/action.service';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { RecordingService } from '../../../../services/recording/recording.service';
import { OpenViduService } from '../../../../services/openvidu/openvidu.service';
import { ILogger } from '../../../../models/logger.model';
import { LoggerService } from '../../../../services/logger/logger.service';

/**
 * The **RecordingActivityComponent** is the component that allows showing the recording activity.
 */
@Component({
	selector: 'ov-recording-activity',
	templateUrl: './recording-activity.component.html',
	styleUrls: ['./recording-activity.component.scss', '../activities-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})

// TODO: Allow to add more than one recording type
// TODO: Allow to choose where the recording is stored (s3, google cloud, etc)
// TODO: Allow to choose the layout of the recording
export class RecordingActivityComponent implements OnInit {
	/**
	 * @internal
	 */
	@Input() expanded: boolean;

	/**
	 * This event is fired when the user clicks on the start recording button.
	 * It provides the {@link RecordingStartRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStartRequested: EventEmitter<RecordingStartRequestedEvent> = new EventEmitter<RecordingStartRequestedEvent>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 * It provides the {@link RecordingStopRequestedEvent} payload as event data.
	 */
	@Output() onRecordingStopRequested: EventEmitter<RecordingStopRequestedEvent> = new EventEmitter<RecordingStopRequestedEvent>();

	/**
	 * Provides event notifications that fire when delete recording button has been clicked.
	 * It provides the {@link RecordingDeleteRequestedEvent} payload as event data.
	 */
	@Output() onRecordingDeleteRequested: EventEmitter<RecordingDeleteRequestedEvent> = new EventEmitter<RecordingDeleteRequestedEvent>();

	/**
	 * Provides event notifications that fire when download recording button has been clicked.
	 * It provides the {@link RecordingDownloadClickedEvent} payload as event data.
	 */
	@Output() onRecordingDownloadClicked: EventEmitter<RecordingDownloadClickedEvent> = new EventEmitter<RecordingDownloadClickedEvent>();

	/**
	 * Provides event notifications that fire when play recording button has been clicked.
	 * It provides the {@link RecordingPlayClickedEvent} payload as event data.
	 */
	@Output() onRecordingPlayClicked: EventEmitter<RecordingPlayClickedEvent> = new EventEmitter<RecordingPlayClickedEvent>();

	/**
	 * @internal
	 */
	recordingStatus: RecordingStatus = RecordingStatus.STOPPED;
	/**
	 * @internal
	 */
	oldRecordingStatus: RecordingStatus;
	/**
	 * @internal
	 */
	isPanelOpened: boolean = false;

	/**
	 * @internal
	 */
	recStatusEnum = RecordingStatus;

	/**
	 * @internal
	 */
	recordingAlive: boolean = false;
	/**
	 * @internal
	 */
	recordingList: RecordingInfo[] = [];

	/**
	 * @internal
	 */
	recordingError: any;

	/**
	 * @internal
	 */
	mouseHovering: boolean = false;
	private log: ILogger;
	private recordingStatusSubscription: Subscription;

	/**
	 * @internal
	 */
	constructor(
		private recordingService: RecordingService,
		private participantService: ParticipantService,
		private actionService: ActionService,
		private openviduService: OpenViduService,
		private cd: ChangeDetectorRef,
		private loggerSrv: LoggerService
	) {
		this.log = this.loggerSrv.get('RecordingActivityComponent');
	}

	/**
	 * @internal
	 */
	ngOnInit(): void {
		this.subscribeToRecordingStatus();
	}

	/**
	 * @internal
	 */
	ngOnDestroy() {
		if (this.recordingStatusSubscription) this.recordingStatusSubscription.unsubscribe();
	}

	/**
	 * @internal
	 */
	setPanelOpened(value: boolean) {
		this.isPanelOpened = value;
	}

	/**
	 * @internal
	 */
	resetStatus() {
		if (this.oldRecordingStatus === RecordingStatus.STARTING) {
			this.recordingService.setRecordingStopped();
		} else if (this.oldRecordingStatus === RecordingStatus.STOPPING) {
			this.recordingService.setRecordingStarted();
		} else {
			this.recordingService.setRecordingStopped();
		}
	}

	/**
	 * @internal
	 */
	startRecording() {
		const payload: RecordingStartRequestedEvent = {
			roomName: this.openviduService.getRoomName()
		};
		this.onRecordingStartRequested.emit(payload);
	}

	/**
	 * @internal
	 */
	stopRecording() {
		const currentRecording = this.recordingList.find((rec) => rec.status === RecordingStatus.STARTED);
		const payload: RecordingStopRequestedEvent = {
			roomName: this.openviduService.getRoomName(),
			recordingId: currentRecording?.id
		};
		this.onRecordingStopRequested.emit(payload);
	}

	/**
	 * @internal
	 */

	deleteRecording(recording: RecordingInfo) {
		const succsessCallback = async () => {
			if (!recording.id) {
				throw new Error('Error deleting recording. Recording id is undefined');
			}
			const payload: RecordingDeleteRequestedEvent = {
				roomName: recording.roomName,
				recordingId: recording.id
			};
			this.onRecordingDeleteRequested.emit(payload);
		};
		this.actionService.openDeleteRecordingDialog(succsessCallback.bind(this));
	}

	/**
	 * @internal
	 */
	download(recording: RecordingInfo) {
		if (!recording.filename) {
			this.log.e('Error downloading recording. Recording filename is undefined');
			return;
		}
		const payload: RecordingDownloadClickedEvent = {
			roomName: this.openviduService.getRoomName(),
			recordingId: recording.filename
		};
		this.onRecordingDownloadClicked.emit(payload);
		this.recordingService.downloadRecording(recording);
	}

	/**
	 * @internal
	 */
	play(recording: RecordingInfo) {
		if (!recording.filename) {
			this.log.e('Error playing recording. Recording filename is undefined');
			return;
		}
		const payload: RecordingPlayClickedEvent = {
			roomName: this.openviduService.getRoomName(),
			recordingId: recording.id
		};
		this.onRecordingPlayClicked.emit(payload);
		this.recordingService.playRecording(recording);
	}

	private subscribeToRecordingStatus() {
		this.recordingStatusSubscription = this.recordingService.recordingStatusObs.subscribe((event: RecordingStatusInfo) => {
			const { status, recordingList, error } = event;
			this.recordingStatus = status;
			this.recordingList = recordingList;
			this.recordingError = error;
			this.recordingAlive = this.recordingStatus === RecordingStatus.STARTED;
			if (this.recordingStatus !== RecordingStatus.FAILED) {
				this.oldRecordingStatus = this.recordingStatus;
			}
			this.cd.markForCheck();
		});
	}
}
