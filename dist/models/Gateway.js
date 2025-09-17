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
exports.Gateway = void 0;
const typeorm_1 = require("typeorm");
const ParkingLot_1 = require("./ParkingLot");
const User_1 = require("./User");
const Node_1 = require("./Node");
let Gateway = class Gateway {
    // Virtual properties
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
};
exports.Gateway = Gateway;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Gateway.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ParkingLot_1.ParkingLot, parkingLot => parkingLot.gateways, { onDelete: 'CASCADE', nullable: true }),
    __metadata("design:type", ParkingLot_1.ParkingLot)
], Gateway.prototype, "parkingLot", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, user => user.linkedGateways, { nullable: true }),
    __metadata("design:type", User_1.User)
], Gateway.prototype, "linkedAdmin", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    __metadata("design:type", User_1.User)
], Gateway.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Node_1.Node, node => node.gateway),
    __metadata("design:type", Array)
], Gateway.prototype, "nodes", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Gateway.prototype, "chirpstackGatewayId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Gateway.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Gateway.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Gateway.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Gateway.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Gateway.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Gateway.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Gateway.prototype, "isLinked", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Gateway.prototype, "lastSeen", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Gateway.prototype, "linkedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Gateway.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Gateway.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Gateway.prototype, "updatedAt", void 0);
exports.Gateway = Gateway = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['isActive', 'createdAt']),
    (0, typeorm_1.Index)(['linkedAdmin', 'isActive'])
], Gateway);
