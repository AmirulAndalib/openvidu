import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	OnDestroy,
	OnInit,
	TemplateRef,
	ViewChild
} from '@angular/core';
// import { ParticipantModel } from '../../../../models/participant.model';
import { ParticipantService } from '../../../../services/participant/participant.service';
import { PanelService } from '../../../../services/panel/panel.service';
import { ParticipantPanelItemDirective } from '../../../../directives/template/openvidu-components-angular.directive';
import { Subscription } from 'rxjs';
import { ParticipantModel } from '../../../../models/participant.model';
import { TemplateManagerService, ParticipantsPanelTemplateConfiguration } from '../../../../services/template/template-manager.service';

/**
 * The **ParticipantsPanelComponent** is hosted inside of the {@link PanelComponent}.
 * It is in charge of displaying the participants connected to the session.
 * This component is composed by the {@link ParticipantPanelItemComponent}.
 */
@Component({
	selector: 'ov-participants-panel',
	templateUrl: './participants-panel.component.html',
	styleUrls: ['../../panel.component.scss', './participants-panel.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})
export class ParticipantsPanelComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	localParticipant: ParticipantModel | undefined;
	/**
	 * @ignore
	 */
	remoteParticipants: ParticipantModel[] = [];

	/**
	 * @ignore
	 */
	@ViewChild('defaultParticipantPanelItem', { static: false, read: TemplateRef }) defaultParticipantPanelItemTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('participantPanelItem', { read: TemplateRef }) participantPanelItemTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild(ParticipantPanelItemDirective)
	set externalParticipantPanelItem(externalParticipantPanelItem: ParticipantPanelItemDirective) {
		this._externalParticipantPanelItem = externalParticipantPanelItem;
		if (externalParticipantPanelItem) {
			this.updateTemplatesAndMarkForCheck();
		}
	}

	/**
	 * @internal
	 * Template configuration managed by the service
	 */
	templateConfig: ParticipantsPanelTemplateConfiguration = {};

	// Store directive references for template setup
	private _externalParticipantPanelItem?: ParticipantPanelItemDirective;

	private localParticipantSubs: Subscription;
	private remoteParticipantsSubs: Subscription;

	/**
	 * @ignore
	 */
	constructor(
		private participantService: ParticipantService,
		private panelService: PanelService,
		private cd: ChangeDetectorRef,
		private templateManagerService: TemplateManagerService
	) {}

	/**
	 * @ignore
	 */
	ngOnInit(): void {
		this.setupTemplates();

		this.localParticipantSubs = this.participantService.localParticipant$.subscribe((p: ParticipantModel | undefined) => {
			if (p) {
				this.localParticipant = p;
				this.cd.markForCheck();
			}
		});

		this.remoteParticipantsSubs = this.participantService.remoteParticipants$.subscribe((p: ParticipantModel[]) => {
			this.remoteParticipants = p;
			this.cd.markForCheck();
		});
	}

	/**
	 * @ignore
	 */
	ngOnDestroy() {
		if (this.localParticipantSubs) this.localParticipantSubs.unsubscribe();
		if (this.remoteParticipantsSubs) this.remoteParticipantsSubs.unsubscribe;
	}

	/**
	 * @ignore
	 */
	ngAfterViewInit() {
		if (!this.participantPanelItemTemplate) {
			// the user has override the default participants panel but not the 'participant-panel-item'
			// so the default component must be injected
			this.participantPanelItemTemplate = this.defaultParticipantPanelItemTemplate;
			this.cd.detectChanges();
		}
	}

	/**
	 * @internal
	 * Sets up all templates using the template manager service
	 */
	private setupTemplates(): void {
		this.templateConfig = this.templateManagerService.setupParticipantsPanelTemplates(
			this._externalParticipantPanelItem,
			this.defaultParticipantPanelItemTemplate
		);

		// Apply templates to component properties for backward compatibility
		this.applyTemplateConfiguration();
	}

	/**
	 * @internal
	 * Applies the template configuration to component properties
	 */
	private applyTemplateConfiguration(): void {
		if (this.templateConfig.participantPanelItemTemplate) {
			this.participantPanelItemTemplate = this.templateConfig.participantPanelItemTemplate;
		}
	}

	/**
	 * @internal
	 * Updates templates and triggers change detection
	 */
	private updateTemplatesAndMarkForCheck(): void {
		this.setupTemplates();
		this.cd.markForCheck();
	}

	/**
	 * @ignore
	 */
	close() {
		this.panelService.closePanel();
	}
}
