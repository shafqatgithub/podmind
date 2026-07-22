import { IsIn } from "class-validator";
import { EXPORT_FORMATS, type ExportFormat } from "../export.renderers";

export class ExportQueryDto {
  @IsIn(EXPORT_FORMATS)
  format!: ExportFormat;
}
