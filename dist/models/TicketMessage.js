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
exports.TicketMessage = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const SupportTicket_1 = require("./SupportTicket");
let TicketMessage = class TicketMessage {
    // Mark message as read
    markAsRead() {
        this.isRead = true;
        this.readAt = new Date();
    }
    // Determine sender type from user role
    static getSenderType(userRole) {
        switch (userRole) {
            case 'super_admin':
                return 'super_admin';
            case 'admin':
                return 'admin';
            case 'user':
                return 'user';
            default:
                return 'user';
        }
    }
};
exports.TicketMessage = TicketMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TicketMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TicketMessage.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SupportTicket_1.SupportTicket, (ticket) => ticket.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'ticketId' }),
    __metadata("design:type", SupportTicket_1.SupportTicket)
], TicketMessage.prototype, "ticket", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TicketMessage.prototype, "senderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { eager: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'senderId' }),
    __metadata("design:type", User_1.User)
], TicketMessage.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], TicketMessage.prototype, "senderType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], TicketMessage.prototype, "senderName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], TicketMessage.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, default: '{}' }),
    __metadata("design:type", Array)
], TicketMessage.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], TicketMessage.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TicketMessage.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], TicketMessage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TicketMessage.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TicketMessage.prototype, "updatedAt", void 0);
exports.TicketMessage = TicketMessage = __decorate([
    (0, typeorm_1.Entity)('ticket_messages')
], TicketMessage);
