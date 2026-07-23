import { Injectable } from "@nestjs/common";
import { AdminRepository } from "./admin.repository";
import type {
  CreateAnnouncementDto,
  UpdateTicketDto,
  UpsertFlagDto,
} from "./dto/admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  /** Everything the admin dashboard needs in one round trip. */
  async dashboard() {
    const [overview, usage, breakdown, health, errors] = await Promise.all([
      this.repository.overview(),
      this.repository.aiUsage(30),
      this.repository.aiBreakdown(),
      this.repository.health(),
      this.repository.recentErrors(10),
    ]);
    return { overview, usage, breakdown, health, errors };
  }

  organizations() {
    return this.repository.organizations().then((items) => ({ items }));
  }

  aiUsage(days?: number) {
    return this.repository.aiUsage(days ?? 30).then((items) => ({ items }));
  }

  health() {
    return this.repository.health();
  }

  listFlags() {
    return this.repository.listFlags().then((items) => ({ items }));
  }

  upsertFlag(dto: UpsertFlagDto) {
    return this.repository.upsertFlag(dto);
  }

  async deleteFlag(id: string) {
    await this.repository.deleteFlag(id);
    return { deleted: true };
  }

  listAnnouncements() {
    return this.repository.listAnnouncements().then((items) => ({ items }));
  }

  createAnnouncement(adminId: string, dto: CreateAnnouncementDto) {
    return this.repository.createAnnouncement(adminId, dto);
  }

  setAnnouncementActive(id: string, isActive: boolean) {
    return this.repository.setAnnouncementActive(id, isActive);
  }

  listTickets(status?: string) {
    return this.repository.listTickets(status).then((items) => ({ items }));
  }

  updateTicket(id: string, adminId: string, dto: UpdateTicketDto) {
    return this.repository.updateTicketStatus(id, dto.status, adminId);
  }
}
