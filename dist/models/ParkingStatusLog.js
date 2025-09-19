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
exports.ParkingStatusLog = void 0;
const typeorm_1 = require("typeorm");
const ParkingSlot_1 = require("./ParkingSlot");
let ParkingStatusLog = class ParkingStatusLog {
};
exports.ParkingStatusLog = ParkingStatusLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParkingStatusLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ParkingSlot_1.ParkingSlot, parkingSlot => parkingSlot.statusLogs, { onDelete: 'CASCADE' }),
    __metadata("design:type", ParkingSlot_1.ParkingSlot)
], ParkingStatusLog.prototype, "parkingSlot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ParkingStatusLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], ParkingStatusLog.prototype, "detectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ParkingStatusLog.prototype, "distance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ParkingStatusLog.prototype, "percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], ParkingStatusLog.prototype, "batteryLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], ParkingStatusLog.prototype, "signalQuality", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ParkingStatusLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ParkingStatusLog.prototype, "createdAt", void 0);
exports.ParkingStatusLog = ParkingStatusLog = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Index)(['parkingSlot', 'detectedAt']),
    (0, typeorm_1.Index)(['status', 'detectedAt'])
], ParkingStatusLog);
