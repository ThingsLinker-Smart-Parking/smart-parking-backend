"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicket = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const TicketMessage_1 = require("./TicketMessage");
let SupportTicket = class SupportTicket {
    async generateTicketNumber() {
        if (!this.ticketNumber) {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const random = Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, '0');
            this.ticketNumber = `TICKET-${year}${month}-${random}`;
        }
    }
    // Helper method to update status
    updateStatus(status) {
        this.status = status;
        if (status === 'resolved') {
            this.resolvedAt = new Date();
        }
        else if (status === 'closed') {
            this.closedAt = new Date();
        }
    }
    // Check if ticket can receive new messages
    canReceiveMessages() {
        return this.status !== 'closed';
    }
    // Get ticket age in days
    getAgeInDays() {
        const now = new Date();
        const created = new Date(this.createdAt);
        const diffTime = Math.abs(now.getTime() - created.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
};
exports.SupportTicket = SupportTicket;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SupportTicket.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "ticketNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", User_1.User)
], SupportTicket.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], SupportTicket.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], SupportTicket.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'medium' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'open' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: false, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'assignedToId' }),
    __metadata("design:type", User_1.User)
], SupportTicket.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, default: '{}' }),
    __metadata("design:type", Array)
], SupportTicket.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SupportTicket.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => TicketMessage_1.TicketMessage, (message) => message.ticket),
    __metadata("design:type", Array)
], SupportTicket.prototype, "messages", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupportTicket.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SupportTicket.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SupportTicket.prototype, "generateTicketNumber", null);
exports.SupportTicket = SupportTicket = __decorate([
    (0, typeorm_1.Entity)('support_tickets')
], SupportTicket);
