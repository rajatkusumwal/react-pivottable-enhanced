/**
 * Angular integration test: the wrapper is driven through TestBed exactly the
 * way a host application would use it.
 */
import "@angular/compiler";
import "zone.js";
import "zone.js/testing";
import { describe, expect, it, beforeAll, afterEach } from "vitest";
import { Component, NgZone } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from "@angular/platform-browser-dynamic/testing";
import { sampleData, sampleFields } from "react-pivottable-enhanced";
import type { PivotConfig, PivotRow } from "react-pivottable-enhanced";
import { PivotStudioComponent } from "./pivot-studio.component";
import { PivotStudioModule } from "./pivot-studio.module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

@Component({
  standalone: true,
  imports: [PivotStudioComponent],
  template: `<pivot-studio
    [data]="data"
    [fields]="fields"
    [title]="title"
    (configChange)="onConfig($event)"
    (dataChange)="onData($event)"
  ></pivot-studio>`,
})
class HostComponent {
  data: PivotRow[] = sampleData;
  fields = sampleFields;
  title = "Sales report";
  configs: PivotConfig[] = [];
  rows: PivotRow[][] = [];
  inZone: boolean[] = [];
  onConfig(config: PivotConfig) {
    this.configs.push(config);
    this.inZone.push(NgZone.isInAngularZone());
  }
  onData(rows: PivotRow[]) {
    this.rows.push(rows);
  }
}

/** Let React flush its work; Angular's fixture only drives the host. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Wait until React has painted something matching `selector`. */
async function waitFor(el: HTMLElement, selector: string): Promise<Element> {
  for (let i = 0; i < 50; i += 1) {
    const found = el.querySelector(selector);
    if (found) return found;
    await flush();
  }
  throw new Error(`Timed out waiting for ${selector}`);
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
});

afterEach(() => {
  TestBed.resetTestingModule();
});

describe("<pivot-studio>", () => {
  it("renders the pivot grid inside the Angular host", async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    const el = fixture.nativeElement as HTMLElement;
    await waitFor(el, "[role='grid']");
    // The title is exposed as the accessible name of the pivot region.
    expect(el.querySelector("[aria-label='Sales report']")).not.toBeNull();
  });

  it("re-renders when an input changes", async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    fixture.componentInstance.title = "Renamed report";
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    await waitFor(el, "[aria-label='Renamed report']");
    expect(el.querySelector("[aria-label='Sales report']")).toBeNull();
  });

  it("renders an empty dataset without crashing", async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.data = [];
    fixture.componentInstance.fields = [];
    fixture.detectChanges();
    await waitFor(fixture.nativeElement as HTMLElement, "[role='grid']");
  });

  it("emits configChange inside the Angular zone when the report changes", async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    const wrapper = fixture.debugElement.children[0]?.componentInstance as PivotStudioComponent;
    let emitted: PivotConfig | null = null;
    wrapper.configChange.subscribe((c: PivotConfig) => (emitted = c));
    // Trigger the React callback the same way the UI does, via the built props.
    const props = (
      wrapper as unknown as { buildProps(): { onConfigChange?: (c: PivotConfig) => void } }
    ).buildProps();
    props.onConfigChange?.({
      rows: [],
      columns: [],
      values: [],
      filters: [],
    } as unknown as PivotConfig);
    expect(emitted).not.toBeNull();
    expect(fixture.componentInstance.inZone.every(Boolean)).toBe(true);
  });

  it("emits dataChange when the React side edits rows", async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    const wrapper = fixture.debugElement.children[0]?.componentInstance as PivotStudioComponent;
    const props = (
      wrapper as unknown as { buildProps(): { onDataChange?: (r: PivotRow[]) => void } }
    ).buildProps();
    props.onDataChange?.([{ a: 1 }]);
    expect(fixture.componentInstance.rows).toHaveLength(1);
  });

  it("tears React down when the component is destroyed", async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await flush();
    const el = fixture.nativeElement as HTMLElement;
    await waitFor(el, "[role='grid']");
    fixture.destroy();
    await flush();
    expect(el.querySelector("[role='grid']")).toBeNull();
  });

  it("survives destruction before the first change detection", () => {
    const fixture = TestBed.createComponent(HostComponent);
    expect(() => fixture.destroy()).not.toThrow();
  });

  it("is also usable through the optional NgModule", async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [PivotStudioModule] });
    const fixture = TestBed.createComponent(PivotStudioComponent);
    fixture.componentInstance.data = sampleData;
    fixture.componentInstance.fields = sampleFields;
    fixture.detectChanges();
    await waitFor(fixture.nativeElement as HTMLElement, "[role='grid']");
  });

  it("applies initialConfig and hides the toolbar when asked", async () => {
    const fixture = TestBed.createComponent(PivotStudioComponent);
    fixture.componentInstance.data = sampleData;
    fixture.componentInstance.fields = sampleFields;
    fixture.componentInstance.showToolbar = false;
    fixture.componentInstance.initialConfig = {
      rows: ["region"],
      values: [{ field: "revenue", aggregator: "sum" }],
    };
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    await waitFor(el, "[role='grid']");
    expect(el.textContent).toContain("Sum of Revenue");
    expect(el.querySelector("button[title='Export']")).toBeNull();
  });

  it("omits optional props that were never set, so React keeps its defaults", () => {
    const fixture = TestBed.createComponent(PivotStudioComponent);
    const wrapper = fixture.componentInstance as unknown as {
      buildProps(): Record<string, unknown>;
    };
    const props = wrapper.buildProps();
    for (const key of ["engine", "initialConfig", "config", "permissions", "datasetId"]) {
      expect(key in props, key).toBe(false);
    }
  });

  it("maps every React prop onto an input or an output", () => {
    const reactProps = propNamesOf(
      readFileSync(
        resolve(dirname(fileURLToPath(import.meta.url)), "../../standalone/src/pivot/PivotStudio.tsx"),
        "utf-8",
      ),
    );
    // Callbacks are surfaced as Angular outputs with a shorter name.
    const outputs: Record<string, string> = {
      onConfigChange: "configChange",
      onDataChange: "dataChange",
    };
    const instance = TestBed.createComponent(PivotStudioComponent)
      .componentInstance as unknown as Record<string, unknown>;
    for (const prop of reactProps) {
      const name = outputs[prop] ?? prop;
      expect(name in instance, `missing wrapper member for ${prop}`).toBe(true);
    }
  });
});

/** Property names declared in the PivotStudioProps interface of the React source. */
function propNamesOf(source: string): string[] {
  const body = source.split("export interface PivotStudioProps {")[1]?.split("\n}")[0] ?? "";
  return [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1] as string);
}

