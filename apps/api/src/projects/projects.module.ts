import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller";
import { ProjectsRepository } from "./projects.repository";

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsRepository],
  exports: [ProjectsRepository],
})
export class ProjectsModule {}
