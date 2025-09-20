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
exports.Node = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const ParkingSlot_1 = require("./ParkingSlot");
let Node = class Node {
    // Simplified status properties
    get isOnline() {
        if (!this.lastSeen)
            return false;
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        return this.lastSeen > fiveMinutesAgo;
    }
    get status() {
        if (!this.isActive)
            return 'inactive';
        return this.isOnline ? 'online' : 'offline';
    }
    get batteryLevel() {
        return this.metadata?.batteryLevel || null;
    }
    get distance() {
        return this.metadata?.distance || null;
    }
    get percentage() {
        return this.metadata?.percentage || null;
    }
    // Enhanced slot status based on ChirpStack data and percentage
    get slotStatus() {
        // Check if we have ChirpStack sensor state first
        const sensorState = this.metadata?.state;
        if (sensorState === 'FREE')
            return 'available';
        if (sensorState === 'OCCUPIED')
            return 'occupied';
        // Fallback to percentage-based logic
        const percentage = this.percentage;
        if (percentage === null)
            return null;
        if (percentage >= 80)
            return 'available';
        if (percentage < 60)
            return 'occupied';
        return 'unknown'; // Between 60-80% is indeterminate
    }
    get signalQuality() {
        return this.metadata?.signalQuality || null;
    }
    get rssi() {
        return this.metadata?.rssi || null;
    }
    get snr() {
        return this.metadata?.snr || null;
    }
    get gatewayId() {
        return this.metadata?.gatewayId || null;
    }
    get lastChirpStackUpdate() {
        return this.metadata?.lastChirpStackUpdate || null;
    }
};
exports.Node = Node;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Node.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, user => user.nodes, { onDelete: 'CASCADE' }),
    __metadata("design:type", User_1.User)
], Node.prototype, "admin", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => ParkingSlot_1.ParkingSlot, parkingSlot => parkingSlot.node, { onDelete: 'CASCADE', nullable: false }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", ParkingSlot_1.ParkingSlot)
], Node.prototype, "parkingSlot", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Node.prototype, "chirpstackDeviceId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Node.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Node.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Node.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Node.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Node.prototype, "lastSeen", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Node.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Node.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Node.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Node.prototype, "updatedAt", void 0);
exports.Node = Node = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['isActive', 'lastSeen']),
    (0, typeorm_1.Index)(['admin', 'isActive'])
], Node);
