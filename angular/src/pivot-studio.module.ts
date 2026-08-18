/**
 * Optional NgModule for apps that are not on standalone components yet.
 *
 *   @NgModule({ imports: [PivotStudioModule] })
 */
import { NgModule } from "@angular/core";
import { PivotStudioComponent } from "./pivot-studio.component";

@NgModule({
  imports: [PivotStudioComponent],
  exports: [PivotStudioComponent],
})
export class PivotStudioModule {}
