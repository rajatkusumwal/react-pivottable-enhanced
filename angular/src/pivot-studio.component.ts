/**
 * <pivot-studio> — Angular wrapper around the React PivotStudio component.
 *
 * The wrapper is deliberately thin: every input maps 1:1 onto a React prop and
 * every output is a React callback re-emitted inside Angular's zone. No pivot
 * logic lives here.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  inject,
  Output,
  type OnChanges,
  type OnDestroy,
  type OnInit,
} from "@angular/core";
import type {
  FieldDef,
  Permissions,
  PivotConfig,
  PivotEngineAdapter,
  PivotRow,
  PivotStudioProps,
} from "react-pivottable-enhanced";
import { createPivotMount, type PivotMount } from "./react-mount";

export type UploadHandler = (
  file: File,
) => Promise<{ datasetId: string; rowCount: number; fields: FieldDef[] }>;

@Component({
  selector: "pivot-studio",
  standalone: true,
  template: "",
  // React owns the DOM inside the host, so Angular never needs to re-check it.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PivotStudioComponent implements OnInit, OnChanges, OnDestroy {
  /** Records to analyse (used by the local engine). */
  @Input() data: PivotRow[] = [];
  /** Field metadata; pass `inferFields(data)` when you do not have one. */
  @Input() fields: FieldDef[] = [];
  /** Aggregation engine; defaults to the in-browser one. */
  @Input() engine?: PivotEngineAdapter;
  /** Starting configuration (uncontrolled). */
  @Input() initialConfig?: Partial<PivotConfig>;
  /** Fully controlled configuration; pair it with (configChange). */
  @Input() config?: PivotConfig;
  @Input() permissions?: Permissions;
  @Input() title = "Pivot table";
  @Input() className = "";
  @Input() showSidebar = true;
  @Input() showToolbar = true;
  @Input() allowFileUpload = false;
  /** Backend uploader; when given, uploads go to the service instead of memory. */
  @Input() onUploadToBackend?: UploadHandler;
  /** Dataset handle for backend queries. */
  @Input() datasetId?: string;
  @Input() fieldsUi: "dialog" | "sidebar" = "dialog";

  /** Fires whenever the report layout changes (drag & drop, sorting, filters…). */
  @Output() readonly configChange = new EventEmitter<PivotConfig>();
  /** Fires when inline editing writes new values back into the records. */
  @Output() readonly dataChange = new EventEmitter<PivotRow[]>();

  private mount: PivotMount | null = null;
  // inject() avoids constructor-parameter metadata, so the wrapper works with
  // any bundler, including ones that do not emit decorator metadata.
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);

  ngOnInit(): void {
    this.zone.runOutsideAngular(() => {
      this.mount = createPivotMount(this.elementRef.nativeElement);
      this.mount.render(this.buildProps());
    });
  }

  ngOnChanges(): void {
    if (!this.mount) return; // inputs set before the first render are picked up by ngOnInit
    this.zone.runOutsideAngular(() => this.mount?.render(this.buildProps()));
  }

  ngOnDestroy(): void {
    this.mount?.destroy();
    this.mount = null;
  }

  /** Translate the inputs into React props, re-entering the zone for outputs. */
  private buildProps(): PivotStudioProps {
    const props: PivotStudioProps = {
      data: this.data ?? [],
      fields: this.fields ?? [],
      title: this.title,
      className: this.className,
      showSidebar: this.showSidebar,
      showToolbar: this.showToolbar,
      allowFileUpload: this.allowFileUpload,
      fieldsUi: this.fieldsUi,
      onConfigChange: (config) => this.zone.run(() => this.configChange.emit(config)),
      onDataChange: (rows) => this.zone.run(() => this.dataChange.emit(rows)),
    };
    // Optional props are only set when provided so React keeps its own defaults.
    if (this.engine) props.engine = this.engine;
    if (this.initialConfig) props.initialConfig = this.initialConfig;
    if (this.config) props.config = this.config;
    if (this.permissions) props.permissions = this.permissions;
    if (this.onUploadToBackend) props.onUploadToBackend = this.onUploadToBackend;
    if (this.datasetId) props.datasetId = this.datasetId;
    return props;
  }
}
